// workers/cleanupWorker.js
// Bull worker for cleanup jobs

import Queue from 'bull';
import config from '../config/index.js';
import { cleanupJobHandlers } from '../jobs/cleanupJobs.js';
import logger from '../utils/logger.js';

const cleanupQueue = new Queue('cleanup', config.redis.url);

cleanupQueue.process('cleanup-old-scans', async (job) => {
  const { daysOld = 30 } = job.data;
  return await cleanupJobHandlers.cleanupOldSoftDeletedScans(daysOld);
});

cleanupQueue.process('cleanup-old-logs', async (job) => {
  const { daysOld = 90 } = job.data;
  return await cleanupJobHandlers.cleanupOldAnalysisLogs(daysOld);
});

cleanupQueue.on('completed', (job, result) => {
  logger.info('Cleanup job completed', {
    jobId: job.id,
    jobName: job.name,
    deletedCount: result?.deletedCount,
  });
});

cleanupQueue.on('failed', (job, err) => {
  logger.error('Cleanup job failed', {
    jobId: job.id,
    jobName: job.name,
    error: err.message,
  });
});

// Schedule recurring cleanup jobs
cleanupQueue.add(
  'cleanup-old-scans',
  { daysOld: 30 },
  {
    repeat: { cron: '0 2 * * 0' }, // Every Sunday at 2 AM
  }
);

cleanupQueue.add(
  'cleanup-old-logs',
  { daysOld: 90 },
  {
    repeat: { cron: '0 3 * * 0' }, // Every Sunday at 3 AM
  }
);

export { cleanupQueue };



