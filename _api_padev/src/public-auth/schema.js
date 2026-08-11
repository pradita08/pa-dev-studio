/**
 * Skema identitas pengunjung.
 *
 * Tabel publik sengaja tidak berbagi tabel, foreign key, password hash,
 * maupun sesi dengan User Management admin. Tabel legacy CodeIgniter/Shield
 * juga tidak disentuh.
 */
import { getPool } from '../db.js';

export const migratePublicAuth = async () => {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_public_accounts (
      id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email              VARCHAR(254)    NOT NULL,
      display_name       VARCHAR(160)    NOT NULL,
      password_hash      VARCHAR(255)    NULL,
      avatar_url         VARCHAR(2048)   NULL,
      status             ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
      email_verified_at  DATETIME       NULL,
      last_login_at      DATETIME       NULL,
      created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_public_account_email (email),
      KEY idx_padev_public_account_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_public_identities (
      id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      account_id         BIGINT UNSIGNED NOT NULL,
      provider           ENUM('manual', 'google', 'github') NOT NULL,
      provider_subject   VARCHAR(255)    NOT NULL,
      provider_email     VARCHAR(254)    NULL,
      created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_public_identity_provider_subject (provider, provider_subject),
      UNIQUE KEY uq_padev_public_identity_account_provider (account_id, provider),
      KEY idx_padev_public_identity_account (account_id),
      CONSTRAINT fk_padev_public_identity_account FOREIGN KEY (account_id)
        REFERENCES padev_public_accounts (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_public_sessions (
      token_hash         CHAR(64)       NOT NULL,
      account_id         BIGINT UNSIGNED NOT NULL,
      expires_at         DATETIME       NOT NULL,
      revoked_at         DATETIME       NULL,
      user_agent         VARCHAR(255)   NULL,
      ip_address         VARCHAR(45)    NULL,
      created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (token_hash),
      KEY idx_padev_public_session_account (account_id),
      KEY idx_padev_public_session_expires (expires_at),
      CONSTRAINT fk_padev_public_session_account FOREIGN KEY (account_id)
        REFERENCES padev_public_accounts (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_public_oauth_states (
      state_hash         CHAR(64)       NOT NULL,
      provider           ENUM('google', 'github') NOT NULL,
      code_verifier      VARCHAR(128)   NOT NULL,
      redirect_uri       VARCHAR(2048)  NOT NULL,
      expires_at         DATETIME       NOT NULL,
      used_at            DATETIME       NULL,
      created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (state_hash),
      KEY idx_padev_public_oauth_state_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

