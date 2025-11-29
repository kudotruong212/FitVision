// jobs/cleanupJobs.js
// Cleanup job definitions

import { ScanSession } from '../models/ScanSession.js';
import { AnalysisLog } from '../models/AnalysisLog.js';
import cloudinary from '../cloudinary.js';
import logger from '../utils/logger.js';

export const cleanupJobHandlers = {
  async cleanupOldSoftDeletedScans(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldScans = await ScanSession.find({
        deletedAt: { $exists: true, $lt: cutoffDate },
      }).lean();

      let deletedCount = 0;
      for (const scan of oldScans) {
        // Delete from Cloudinary if public_id exists
        if (scan.image_public_id) {
          try {
            await cloudinary.uploader.destroy(scan.image_public_id);
          } catch (err) {
            logger.warn('Failed to delete Cloudinary image', {
              publicId: scan.image_public_id,
              error: err.message,
            });
          }
        }

        // Delete from database
        await ScanSession.deleteOne({ _id: scan._id });
        deletedCount += 1;
      }

      logger.info('Cleanup old soft-deleted scans completed', { deletedCount });
      return { deletedCount };
    } catch (err) {
      logger.error('Cleanup job error', { error: err.message, stack: err.stack });
      throw err;
    }
  },

  async cleanupOldAnalysisLogs(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await AnalysisLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info('Cleanup old analysis logs completed', { deletedCount: result.deletedCount });
      return { deletedCount: result.deletedCount };
    } catch (err) {
      logger.error('Cleanup analysis logs error', { error: err.message, stack: err.stack });
      throw err;
    }
  },
};


