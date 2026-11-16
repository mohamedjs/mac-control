import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const newToken = () => crypto.randomBytes(18).toString('base64url');

/**
 * Load the pairing key from disk, creating it (mode 0600) on first run.
 * Pass null to get an in-memory key (tests).
 */
export function loadOrCreateToken(tokenFile) {
  if (!tokenFile) return newToken();
  try {
    const existing = fs.readFileSync(tokenFile, 'utf8').trim();
    if (existing.length >= 16) return existing;
  } catch {}
  return rotateToken(tokenFile);
}

/** Write a brand-new key, invalidating every link handed out before. */
export function rotateToken(tokenFile) {
  const token = newToken();
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, token + '\n', { mode: 0o600 });
  return token;
}

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
