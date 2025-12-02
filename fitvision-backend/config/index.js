// config/index.js
// Centralized configuration object

import { validateEnv } from './validateEnv.js';

// Validate environment on import
validateEnv();

export const config = {
  server: {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  database: {
    uri: process.env.MONGODB_URI,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  },

  encryption: {
    key: process.env.DATA_ENCRYPTION_KEY || '',
    enabled: Boolean(process.env.DATA_ENCRYPTION_KEY && process.env.DATA_ENCRYPTION_KEY.length > 0),
  },

  scan: {
    quotaPerDay: Number(process.env.SCAN_QUOTA_PER_DAY) || 20,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(',').map(o => o.trim()),
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'resend',
    from: process.env.EMAIL_FROM || 'noreply@fitvision.com',
    fromName: process.env.EMAIL_FROM_NAME || 'FitVision',
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  /**
   * Redis configuration
   *
   * Lưu ý:
   * - Trong môi trường test, ta **không** nên tự động bật Redis
   *   để tránh tạo kết nối/background handles làm Jest không thoát được.
   * - Nếu thật sự cần Redis trong test, có thể set REDIS_URL thủ công.
   */
  redis: {
    // Chỉ dùng default URL khi KHÔNG phải test
    url:
      process.env.NODE_ENV === 'test'
        ? process.env.REDIS_URL || ''
        : process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

export default config;



