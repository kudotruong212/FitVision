// services/encryptionService.js
// Encryption service with config setup

import crypto from 'crypto';
import config from '../config/index.js';
import { encryptSensitive as encryptUtil, decryptSensitive as decryptUtil } from '../utils/encryptionUtils.js';

const IV_LENGTH = 16;
const RAW_ENCRYPTION_KEY = config.encryption.key;
const ENCRYPTION_ENABLED = config.encryption.enabled;
const ENCRYPTION_KEY = ENCRYPTION_ENABLED
  ? crypto.createHash("sha256").update(RAW_ENCRYPTION_KEY).digest()
  : null;

export function encryptSensitive(value) {
  if (!ENCRYPTION_ENABLED || !ENCRYPTION_KEY) {
    return value || null;
  }
  return encryptUtil(value, ENCRYPTION_KEY, IV_LENGTH);
}

export function decryptSensitive(payload) {
  if (!ENCRYPTION_ENABLED || !ENCRYPTION_KEY) {
    return payload;
  }
  return decryptUtil(payload, ENCRYPTION_KEY);
}

