// workers/emailWorker.js
// Bull worker for processing email jobs

import Queue from 'bull';
import config from '../config/index.js';
import { emailJobHandlers } from '../jobs/emailJobs.js';
import logger from '../utils/logger.js';

// Only create queue if Redis is configured
let emailQueue = null;
try {
  if (config.redis.url) {
    emailQueue = new Queue('email', config.redis.url);
    
    emailQueue.process('send-verification', async (job) => {
      const { user, token } = job.data;
      return await emailJobHandlers.sendVerification(user, token);
    });

    emailQueue.process('send-password-reset', async (job) => {
      const { user, token } = job.data;
      return await emailJobHandlers.sendPasswordReset(user, token);
    });

    emailQueue.process('send-welcome', async (job) => {
      const { user } = job.data;
      return await emailJobHandlers.sendWelcome(user);
    });

    emailQueue.on('completed', (job, result) => {
      logger.info('Email job completed', { jobId: job.id, jobName: job.name });
    });

    emailQueue.on('failed', (job, err) => {
      logger.error('Email job failed', {
        jobId: job.id,
        jobName: job.name,
        error: err.message,
      });
    });
  }
} catch (err) {
  console.warn('Failed to create email queue:', err.message);
}

export { emailQueue };

