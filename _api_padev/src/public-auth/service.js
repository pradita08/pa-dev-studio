import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { getPool } from '../db.js';
import { createScryptHash, verifyScryptHash } from '../user-management/scrypt.js';

export const PUBLIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

export class PublicValidationError extends Error {
  constructor(errors, message = 'Data akun publik tidak valid.') {
    super(message);
    this.name = 'PublicValidationError';
    this.errors = errors;
  }
}

export class PublicConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PublicConflictError';
  }
}

export class PublicOAuthError extends Error {
  constructor(message, code = 'oauth_failed') {
    super(message);
    this.name = 'PublicOAuthError';
    this.code = code;
  }
}

export const normalizePublicEmail = (value) => String(value || '').trim().toLowerCase();

export const validatePublicRegistration = ({ name, email, password, passwordConfirmation }) => {
  const errors = {};
  const normalizedEmail = normalizePublicEmail(email);
  const normalizedName = String(name || '').trim();
  const normalizedPassword = String(password || '');

  if (!PUBLIC_EMAIL.test(normalizedEmail) || normalizedEmail.length > 254) {
    errors.email = 'Masukkan alamat email yang valid.';
  }
  if (normalizedName.length < 2 || normalizedName.length > 160) {
    errors.name = 'Nama wajib diisi dan maksimal 160 karakter.';
  }
  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (normalizedPassword !== String(passwordConfirmation || '')) {
    errors.passwordConfirmation = 'Konfirmasi kata sandi tidak sama.';
  }
  if (Object.keys(errors).length) throw new PublicValidationError(errors);

  return { email: normalizedEmail, name: normalizedName, password: normalizedPassword };
};

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

const publicAccountFromRow = (row) => {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.display_name,
    email: row.email,
    avatarUrl: row.avatar_url || null,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
  };
};

export const publicUser = publicAccountFromRow;

export const findPublicAccountByEmail = async (email, connection = getPool()) => {
  const [rows] = await connection.query(
    `SELECT id, email, display_name, password_hash, avatar_url, status, email_verified_at
       FROM padev_public_accounts WHERE email = ? LIMIT 1`,
    [normalizePublicEmail(email)],
  );
  return rows[0] || null;
};

export const findPublicAccountById = async (id, connection = getPool()) => {
  const [rows] = await connection.query(
    `SELECT id, email, display_name, password_hash, avatar_url, status, email_verified_at
       FROM padev_public_accounts WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

export const registerPublicAccount = async (data) => {
  const valid = validatePublicRegistration(data);
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const existing = await findPublicAccountByEmail(valid.email, connection);
    if (existing) throw new PublicConflictError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');

    const [account] = await connection.query(
      `INSERT INTO padev_public_accounts
         (email, display_name, password_hash, status)
       VALUES (?, ?, ?, 'ACTIVE')`,
      [valid.email, valid.name, createScryptHash(valid.password)],
    );
    await connection.query(
      `INSERT INTO padev_public_identities (account_id, provider, provider_subject, provider_email)
       VALUES (?, 'manual', ?, ?)`,
      [account.insertId, valid.email, valid.email],
    );
    await connection.commit();
    return publicUser(await findPublicAccountById(account.insertId));
  } catch (error) {
    await connection.rollback().catch(() => null);
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new PublicConflictError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const authenticatePublicAccount = async (email, password) => {
  const account = await findPublicAccountByEmail(email);
  if (!account) return null;
  if (account.status !== 'ACTIVE') return { blocked: true };
  if (!account.password_hash || !verifyScryptHash(String(password || ''), account.password_hash)) return null;
  return account;
};

export const touchPublicLogin = (accountId) => getPool().query(
  'UPDATE padev_public_accounts SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [accountId],
);

export const createPublicSession = async (accountId, { userAgent, ip } = {}) => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.publicAuth.sessionTtlSeconds * 1000);
  await getPool().query(
    `INSERT INTO padev_public_sessions
       (token_hash, account_id, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [hashToken(token), accountId, expiresAt, String(userAgent || '').slice(0, 255) || null, String(ip || '').slice(0, 45) || null],
  );
  return { token, expiresAt };
};

export const resolvePublicSession = async (token) => {
  if (!token || String(token).length > 256) return null;
  const [rows] = await getPool().query(
    `SELECT a.id, a.email, a.display_name, a.avatar_url, a.status, a.email_verified_at
       FROM padev_public_sessions s
       JOIN padev_public_accounts a ON a.id = s.account_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL
        AND s.expires_at > UTC_TIMESTAMP() AND a.status = 'ACTIVE'
      LIMIT 1`,
    [hashToken(token)],
  );
  return rows[0] ? publicUser(rows[0]) : null;
};

export const revokePublicSession = (token) => {
  if (!token) return Promise.resolve();
  return getPool().query(
    'UPDATE padev_public_sessions SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL',
    [hashToken(token)],
  );
};

export const purgePublicAuthArtifacts = () => Promise.all([
  getPool().query('DELETE FROM padev_public_sessions WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)'),
  getPool().query('DELETE FROM padev_public_oauth_states WHERE expires_at < UTC_TIMESTAMP() OR used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)'),
]);

export const createOAuthState = async ({ provider, state, codeVerifier, redirectUri }) => {
  await getPool().query(
    `INSERT INTO padev_public_oauth_states
       (state_hash, provider, code_verifier, redirect_uri, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [hashToken(state), provider, codeVerifier, redirectUri, new Date(Date.now() + config.publicAuth.stateTtlSeconds * 1000)],
  );
};

/** Membaca + memakai state dalam satu transaksi agar callback tidak bisa dipakai ulang. */
export const consumeOAuthState = async ({ provider, state }) => {
  if (!state || String(state).length > 256) return null;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT state_hash, provider, code_verifier, redirect_uri
         FROM padev_public_oauth_states
        WHERE state_hash = ? AND provider = ? AND used_at IS NULL
          AND expires_at > UTC_TIMESTAMP() LIMIT 1 FOR UPDATE`,
      [hashToken(state), provider],
    );
    const row = rows[0];
    if (!row) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE padev_public_oauth_states SET used_at = UTC_TIMESTAMP() WHERE state_hash = ?', [row.state_hash]);
    await connection.commit();
    return row;
  } catch (error) {
    await connection.rollback().catch(() => null);
    throw error;
  } finally {
    connection.release();
  }
};

const providerEmail = (value) => normalizePublicEmail(value);

/**
 * Hubungkan identitas OAuth ke akun publik berdasarkan subject provider.
 * Linking berdasarkan email hanya boleh jika provider menyatakan emailnya
 * sudah diverifikasi; akun admin tidak pernah ikut dalam pencarian ini.
 */
export const upsertOAuthAccount = async ({ provider, subject, email, name, avatarUrl, emailVerified }) => {
  const normalizedEmail = providerEmail(email);
  if (!subject || !PUBLIC_EMAIL.test(normalizedEmail) || !emailVerified) {
    throw new PublicOAuthError('Provider tidak memberikan email terverifikasi.', 'email_not_verified');
  }

  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [identityRows] = await connection.query(
      `SELECT a.id, a.email, a.display_name, a.avatar_url, a.status, a.email_verified_at
         FROM padev_public_identities i
         JOIN padev_public_accounts a ON a.id = i.account_id
        WHERE i.provider = ? AND i.provider_subject = ? LIMIT 1`,
      [provider, String(subject).slice(0, 255)],
    );

    let account = identityRows[0];
    if (!account) {
      account = await findPublicAccountByEmail(normalizedEmail, connection);
      if (account) {
        const [providerRows] = await connection.query(
          'SELECT id FROM padev_public_identities WHERE account_id = ? AND provider = ? LIMIT 1',
          [account.id, provider],
        );
        if (providerRows[0]) throw new PublicConflictError('Akun publik ini sudah terhubung ke identitas provider lain.');
      } else {
        const [created] = await connection.query(
          `INSERT INTO padev_public_accounts
             (email, display_name, avatar_url, status, email_verified_at)
           VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP())`,
          [normalizedEmail, String(name || normalizedEmail).trim().slice(0, 160), String(avatarUrl || '').slice(0, 2048) || null],
        );
        account = await findPublicAccountById(created.insertId, connection);
      }

      await connection.query(
        `INSERT INTO padev_public_identities (account_id, provider, provider_subject, provider_email)
         VALUES (?, ?, ?, ?)`,
        [account.id, provider, String(subject).slice(0, 255), normalizedEmail],
      );
    } else {
      await connection.query(
        `UPDATE padev_public_accounts
            SET display_name = ?, avatar_url = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP())
          WHERE id = ?`,
        [String(name || account.display_name).trim().slice(0, 160), String(avatarUrl || account.avatar_url || '').slice(0, 2048) || null, account.id],
      );
      await connection.query(
        'UPDATE padev_public_identities SET provider_email = ? WHERE provider = ? AND provider_subject = ?',
        [normalizedEmail, provider, String(subject).slice(0, 255)],
      );
      account = await findPublicAccountById(account.id, connection);
    }

    await connection.commit();
    return publicUser(account);
  } catch (error) {
    await connection.rollback().catch(() => null);
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new PublicConflictError('Identitas provider tersebut sudah digunakan akun lain.');
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const publicAuthCookieOptions = () => ({
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/',
  maxAge: config.publicAuth.sessionTtlSeconds * 1000,
});

export const hashPublicTokenForTest = hashToken;

