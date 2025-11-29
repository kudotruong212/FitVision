// config/validateEnv.js
// Validates all required environment variables on startup

const requiredVars = {
  // Database
  MONGODB_URI: 'MongoDB connection string is required',
  
  // JWT
  JWT_SECRET: 'JWT secret is required for authentication',
  
  // Cloudinary (required for image uploads)
  CLOUDINARY_CLOUD_NAME: 'Cloudinary cloud name is required',
  CLOUDINARY_API_KEY: 'Cloudinary API key is required',
  CLOUDINARY_API_SECRET: 'Cloudinary API secret is required',
};

const optionalVars = {
  PORT: 5000,
  NODE_ENV: 'development',
  AI_SERVICE_URL: 'http://localhost:8001',
  DATA_ENCRYPTION_KEY: '',
  SCAN_QUOTA_PER_DAY: '20',
  JWT_EXPIRES_IN: '7d',
  ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:4173',
  EMAIL_PROVIDER: 'resend',
  EMAIL_FROM: 'noreply@fitvision.com',
  EMAIL_FROM_NAME: 'FitVision',
  LOG_LEVEL: 'info',
  REDIS_URL: 'redis://localhost:6379',
};

export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const [varName, errorMessage] of Object.entries(requiredVars)) {
    if (!process.env[varName]) {
      errors.push(`${varName}: ${errorMessage}`);
    }
  }

  // Validate specific formats
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI: Invalid MongoDB connection string format');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET: Should be at least 32 characters long for production');
  }

  if (process.env.DATA_ENCRYPTION_KEY && process.env.DATA_ENCRYPTION_KEY.length < 32) {
    warnings.push('DATA_ENCRYPTION_KEY: Should be at least 32 characters long for production');
  }

  // Check email provider configuration
  const emailProvider = process.env.EMAIL_PROVIDER || 'resend';
  if (emailProvider === 'resend' && !process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY: Not set, email functionality will not work');
  } else if (emailProvider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    warnings.push('SENDGRID_API_KEY: Not set, email functionality will not work');
  } else if (emailProvider === 'ses' && (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)) {
    warnings.push('AWS credentials not set, email functionality will not work');
  }

  // Display errors and warnings
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Missing required environment variables. Please check your .env file.');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      process.env[varName] = String(defaultValue);
    }
  }

  console.log('✅ Environment variables validated');
}


