// utils/sessionUtils.js
// Session serialization and image URL utilities

import cloudinary from '../cloudinary.js';
import logger from './logger.js';

const SIGNED_URL_TTL = 60 * 5; // 5 phút

export function getSignedImageUrl(publicId) {
  if (!publicId) return null;
  try {
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL,
    });
  } catch (err) {
    logger.error("Cannot sign Cloudinary URL", { error: err.message });
    return null;
  }
}

export function serializeSession(session, decryptSensitiveFn) {
  if (!session) return session;
  const plain = typeof session.toObject === "function" ? session.toObject() : { ...session };
  
  // Security: Loại bỏ sensitive fields
  delete plain.user; // Không trả về user ID
  delete plain.__v; // Mongoose version key
  
  if (plain.image_url && decryptSensitiveFn) {
    plain.image_url = decryptSensitiveFn(plain.image_url);
  }
  plain.signed_image_url = getSignedImageUrl(plain.image_public_id);
  return plain;
}

