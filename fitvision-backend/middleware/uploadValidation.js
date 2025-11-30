// middleware/uploadValidation.js
// File upload validation middleware

import multer from 'multer';
import { ValidationError } from '../utils/errors.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Multer configuration with file filter
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new ValidationError(
        `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
      ),
      false
    );
  }

  // Check file extension
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new ValidationError(
        `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
      ),
      false
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Middleware to validate uploaded file
export function validateUpload(req, res, next) {
  if (!req.file) {
    return next(new ValidationError('No file uploaded'));
  }

  // Additional validation: check file size
  if (req.file.size > MAX_FILE_SIZE) {
    return next(
      new ValidationError(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    );
  }

  // Check if file has content
  if (req.file.size === 0) {
    return next(new ValidationError('Uploaded file is empty'));
  }

  next();
}



