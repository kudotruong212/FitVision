// jobs/emailJobs.js
// Email job definitions for Bull queue

import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import logger from '../utils/logger.js';

export const emailJobHandlers = {
  async sendVerification(user, token) {
    try {
      const result = await sendVerificationEmail(user, token);
      if (result.success) {
        logger.info('Verification email sent', { userId: user._id, email: user.email });
      } else {
        logger.warn('Failed to send verification email', { userId: user._id, error: result.error });
      }
      return result;
    } catch (err) {
      logger.error('Verification email job error', { error: err.message, stack: err.stack });
      throw err;
    }
  },

  async sendPasswordReset(user, token) {
    try {
      const result = await sendPasswordResetEmail(user, token);
      if (result.success) {
        logger.info('Password reset email sent', { userId: user._id, email: user.email });
      } else {
        logger.warn('Failed to send password reset email', { userId: user._id, error: result.error });
      }
      return result;
    } catch (err) {
      logger.error('Password reset email job error', { error: err.message, stack: err.stack });
      throw err;
    }
  },

  async sendWelcome(user) {
    try {
      const result = await sendWelcomeEmail(user);
      if (result.success) {
        logger.info('Welcome email sent', { userId: user._id, email: user.email });
      } else {
        logger.warn('Failed to send welcome email', { userId: user._id, error: result.error });
      }
      return result;
    } catch (err) {
      logger.error('Welcome email job error', { error: err.message, stack: err.stack });
      throw err;
    }
  },
};


