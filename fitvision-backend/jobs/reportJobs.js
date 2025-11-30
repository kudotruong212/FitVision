// jobs/reportJobs.js
// Report generation job definitions

import { ScanSession } from '../models/ScanSession.js';
import logger from '../utils/logger.js';

export const reportJobHandlers = {
  async generateWeeklyReport(userId) {
    try {
      const sessions = await ScanSession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(14)
        .lean();

      // Generate CSV report
      const headers = [
        'date',
        'score',
        'score_delta',
        'weak_muscles',
        'fat_area',
        'risk_level',
        'pose_symmetry',
      ];

      const rows = sessions.map((session) => {
        const line = [
          new Date(session.createdAt).toISOString(),
          session.score ?? '',
          session?.derived_metrics?.score_delta ?? '',
          (session.weak_muscles || []).join(' | '),
          session.fat_area || '',
          session.risk_level || '',
          session?.derived_metrics?.pose_symmetry ?? '',
        ];
        return line.map((val) => {
          const str = String(val || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      logger.info('Weekly report generated', { userId, sessionCount: sessions.length });
      return { csv: csvContent, sessionCount: sessions.length };
    } catch (err) {
      logger.error('Report generation job error', { error: err.message, stack: err.stack });
      throw err;
    }
  },
};



