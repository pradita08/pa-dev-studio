/**
 * Autentikasi akun publik.
 *
 * Endpoint ini sengaja tidak memakai `requireApiAuth`, `padev_session`, JWT
 * admin, atau tabel `mst_user`. Cookie yang terbit hanya mengenali sesi di
 * `padev_public_sessions`.
 */
import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { AttemptLimiter } from '../rate-limit.js';
import {
  PublicConflictError,
  PublicOAuthError,
  PublicValidationError,
  authenticatePublicAccount,
  consumeOAuthState,
  createOAuthState,
  createPublicSession,
  publicAuthCookieOptions,
  publicUser,
  registerPublicAccount,
  resolvePublicSession,
  revokePublicSession,
  touchPublicLogin,
  upsertOAuthAccount,
} from '../public-auth/service.js';

export const publicAuthRouter = Router();

const limiter = new AttemptLimiter(config.publicAuth.login);
const PROVIDERS = new Set(['google', 'github']);

const invalidCredentials = (response) => response
  .status(401)
  .json({ error: 'Unauthorized', message: 'Email atau password salah. Silakan coba lagi.' });

const cookieOptions = publicAuthCookieOptions();
const clearPublicCookie = (response) => response.clearCookie(config.publicAuth.cookieName, {
  httpOnly: cookieOptions.httpOnly,
  secure: cookieOptions.secure,
  sameSite: cookieOptions.sameSite,
  path: cookieOptions.path,
});

const issueCookie = async (request, response, user) => {
  const session = await createPublicSession(user.id, {
    userAgent: request.get('user-agent'),
    ip: request.ip,
  });
  response.cookie(config.publicAuth.cookieName, session.token, cookieOptions);
  return session;
};

const rateLimitKey = (request, email) => `${request.ip}|${String(email || '').trim().toLowerCase()}`;

const providerSettings = (provider) => {
  if (provider === 'google') {
    const { clientId, clientSecret, redirectUri } = config.publicAuth.google;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return {
      provider,
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    };
  }
  if (provider === 'github') {
    const { clientId, clientSecret, redirectUri } = config.publicAuth.github;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return {
      provider,
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
    };
  }
  return null;
};

const pkceVerifier = () => randomBytes(32).toString('base64url');
const pkceChallenge = (verifier) => createHash('sha256').update(verifier).digest('base64url');

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = {}; }
  if (!response.ok) throw new PublicOAuthError('Provider login gagal diproses.', 'provider_request_failed');
  return payload;
};

const providerAuthorizationUrl = async (provider, settings) => {
  const state = randomBytes(32).toString('base64url');
  const codeVerifier = pkceVerifier();
  await createOAuthState({ provider, state, codeVerifier, redirectUri: settings.redirectUri });

  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.redirectUri,
    response_type: 'code',
    state,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: 'S256',
  });
  if (provider === 'google') {
    params.set('scope', 'openid email profile');
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  } else {
    params.set('scope', 'read:user user:email');
  }
  return `${settings.authorizeUrl}?${params.toString()}`;
};

const providerProfile = async (provider, settings, state) => {
  const tokenBody = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    code: state.code,
    redirect_uri: state.redirectUri || settings.redirectUri,
    code_verifier: state.codeVerifier,
  });

  if (provider === 'google') {
    const token = await fetchJson(settings.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenBody,
    });
    if (!token.access_token) throw new PublicOAuthError('Provider tidak mengembalikan token.', 'provider_token_missing');
    const profile = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    return {
      subject: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      avatarUrl: profile.picture || null,
      emailVerified: profile.email_verified === true || profile.email_verified === 'true',
    };
  }

  const token = await fetchJson(settings.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: tokenBody,
  });
  if (!token.access_token) throw new PublicOAuthError('Provider tidak mengembalikan token.', 'provider_token_missing');
  const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'PA-DEV-Studio-Public-Auth' };
  const profile = await fetchJson('https://api.github.com/user', { headers });
  const emails = await fetchJson('https://api.github.com/user/emails', { headers });
  const verifiedEmail = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)
    : null;
  return {
    subject: profile.id,
    email: verifiedEmail?.email || profile.email,
    name: profile.name || profile.login || profile.email,
    avatarUrl: profile.avatar_url || null,
    emailVerified: Boolean(verifiedEmail?.verified),
  };
};

const oauthFailure = (response) => response.redirect(302, config.publicAuth.frontendFailurePath);

publicAuthRouter.post('/register', async (request, response, next) => {
  try {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const limit = limiter.check(rateLimitKey(request, email));
    if (limit.blocked) {
      response.status(429).set('Retry-After', String(limit.retryAfterSeconds)).json({
        error: 'Too Many Requests',
        message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(limit.retryAfterSeconds / 60)} menit.`,
      });
      return;
    }

    const user = await registerPublicAccount({
      name: request.body?.name,
      email,
      password: request.body?.password,
      passwordConfirmation: request.body?.password_confirmation ?? request.body?.passwordConfirmation,
    });
    limiter.succeed(rateLimitKey(request, email));
    await issueCookie(request, response, user);
    response.status(201).json({ user });
  } catch (error) {
    if (error instanceof PublicValidationError) {
      limiter.fail(rateLimitKey(request, request.body?.email));
      response.status(422).json({ error: 'Unprocessable Entity', message: error.message, errors: error.errors });
      return;
    }
    if (error instanceof PublicConflictError) {
      response.status(409).json({ error: 'Conflict', message: error.message });
      return;
    }
    next(error);
  }
});

publicAuthRouter.post('/login', async (request, response, next) => {
  try {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    if (!email || !password) {
      response.status(422).json({ error: 'Unprocessable Entity', message: 'Email dan password wajib diisi.' });
      return;
    }
    const key = rateLimitKey(request, email);
    const limit = limiter.check(key);
    if (limit.blocked) {
      response.status(429).set('Retry-After', String(limit.retryAfterSeconds)).json({
        error: 'Too Many Requests',
        message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(limit.retryAfterSeconds / 60)} menit.`,
      });
      return;
    }
    const account = await authenticatePublicAccount(email, password);
    if (account?.blocked) {
      limiter.fail(key);
      response.status(403).json({ error: 'Forbidden', message: 'Akun publik Anda dinonaktifkan.' });
      return;
    }
    if (!account) {
      limiter.fail(key);
      invalidCredentials(response);
      return;
    }
    limiter.succeed(key);
    const user = publicUser(account);
    await issueCookie(request, response, user);
    await touchPublicLogin(user.id);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

publicAuthRouter.get('/me', async (request, response, next) => {
  try {
    const user = await resolvePublicSession(request.cookies?.[config.publicAuth.cookieName]);
    if (!user) {
      response.status(401).json({ error: 'Unauthorized', message: 'Belum ada sesi akun publik.' });
      return;
    }
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

publicAuthRouter.post('/logout', async (request, response, next) => {
  try {
    await revokePublicSession(request.cookies?.[config.publicAuth.cookieName]);
    clearPublicCookie(response);
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

publicAuthRouter.get('/:provider/start', async (request, response, next) => {
  try {
    const provider = String(request.params.provider || '').toLowerCase();
    if (!PROVIDERS.has(provider)) { response.status(404).json({ error: 'Not Found' }); return; }
    const settings = providerSettings(provider);
    if (!settings) {
      response.status(503).json({ error: 'Service Unavailable', message: 'Login provider belum dikonfigurasi.' });
      return;
    }
    if (request.query?.probe === '1') {
      response.json({ provider, configured: true });
      return;
    }
    response.redirect(302, await providerAuthorizationUrl(provider, settings));
  } catch (error) {
    next(error);
  }
});

publicAuthRouter.get('/:provider/callback', async (request, response, next) => {
  const provider = String(request.params.provider || '').toLowerCase();
  if (!PROVIDERS.has(provider)) { response.status(404).json({ error: 'Not Found' }); return; }
  if (request.query?.error || !request.query?.code || !request.query?.state) { oauthFailure(response); return; }

  try {
    const settings = providerSettings(provider);
    if (!settings) { oauthFailure(response); return; }
    const stored = await consumeOAuthState({ provider, state: request.query.state });
    if (!stored) { oauthFailure(response); return; }
    const profile = await providerProfile(provider, settings, {
      code: request.query.code,
      codeVerifier: stored.code_verifier,
      redirectUri: stored.redirect_uri,
    });
    const user = await upsertOAuthAccount({ provider, ...profile });
    await issueCookie(request, response, user);
    await touchPublicLogin(user.id);
    response.redirect(302, config.publicAuth.frontendSuccessPath);
  } catch (error) {
    if (error instanceof PublicOAuthError || error instanceof PublicConflictError) {
      oauthFailure(response);
      return;
    }
    next(error);
  }
});
