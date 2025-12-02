// workers/reportWorker.js
// Bull worker for processing report generation jobs

import Queue from 'bull';
import config from '../config/index.js';
import { reportJobHandlers } from '../jobs/reportJobs.js';
import logger from '../utils/logger.js';

let reportQueue = null;

// Chỉ khởi tạo Bull queue khi không chạy trong môi trường test
if (process.env.NODE_ENV !== 'test' && config.redis.url) {
  reportQueue = new Queue('reports', config.redis.url);

  reportQueue.process('generate-weekly', async (job) => {
    const { userId } = job.data;
    return await reportJobHandlers.generateWeeklyReport(userId);
  });

  reportQueue.on('completed', (job, result) => {
    logger.info('Report job completed', { jobId: job.id, sessionCount: result?.sessionCount });
  });

  reportQueue.on('failed', (job, err) => {
    logger.error('Report job failed', {
      jobId: job.id,
      error: err.message,
    });
  });
}

export { reportQueue };



