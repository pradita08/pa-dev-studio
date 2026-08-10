/**
 * Hash kata sandi — scrypt.
 *
 * Dipindahkan dari `api_bridge_gateway/src/lib/crypto.js`.
 *
 * Scrypt dipilih karena mahal secara memori, sehingga jauh lebih tahan
 * tebak-paksa memakai GPU dibanding hash cepat. Salt acak menyatu dalam
 * hasilnya, jadi tidak ada kolom terpisah yang bisa lupa ikut disalin.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** @returns {string} Format `scrypt$<salt>$<hash>`. */
export const createScryptHash = (password, salt = randomBytes(16).toString('hex')) => {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
};

/**
 * Memverifikasi kata sandi terhadap hash tersimpan.
 *
 * Perbandingan memakai `timingSafeEqual` supaya lama proses tidak membocorkan
 * berapa banyak karakter awal yang sudah cocok.
 */
export const verifyScryptHash = (password, encoded) => {
  const bagian = String(encoded || '').split('$');
  if (bagian.length !== 3 || bagian[0] !== 'scrypt') return false;

  const [, salt, hash] = bagian;
  let harapan;
  let nyata;
  try {
    harapan = Buffer.from(hash, 'hex');
    nyata = scryptSync(password, salt, harapan.length);
  } catch (_) {
    return false;
  }
  if (harapan.length !== nyata.length) return false;
  return timingSafeEqual(harapan, nyata);
};

/** Perbandingan string tahan-waktu untuk nilai non-rahasia yang tetap sensitif. */
export const safeEqual = (a, b) => {
  const kiri = Buffer.from(String(a));
  const kanan = Buffer.from(String(b));
  if (kiri.length !== kanan.length) return false;
  return timingSafeEqual(kiri, kanan);
};
