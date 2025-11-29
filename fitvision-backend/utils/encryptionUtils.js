// utils/encryptionUtils.js
// Encryption utility functions
// Note: These functions require ENCRYPTION_KEY and IV_LENGTH to be passed as parameters
// The actual encryption service will handle the key setup

import crypto from 'crypto';

export function encryptSensitive(value, encryptionKey, ivLength = 16) {
  if (!value || !encryptionKey) return value || null;
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv("aes-256-ctr", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSensitive(payload, encryptionKey) {
  if (!payload || !encryptionKey) return payload;
  const [ivHex, dataHex] = payload.split(":");
  if (!ivHex || !dataHex) return payload;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-ctr", encryptionKey, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

