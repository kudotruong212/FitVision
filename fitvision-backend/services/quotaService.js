// services/quotaService.js
// Quota management service

import config from '../config/index.js';

const DEFAULT_DAILY_SCAN_MAX = config.scan.quotaPerDay;

export function getQuotaState(user) {
  const today = new Date().toISOString().slice(0, 10);
  const max = user.scanQuota?.max || DEFAULT_DAILY_SCAN_MAX;
  const lastDate = user.scanQuota?.date;
  const count = lastDate === today ? user.scanQuota?.count || 0 : 0;
  const left = Math.max(0, max - count);
  return { allowed: left > 0, left, max, date: today, count };
}

export async function incrementQuota(user, quotaState) {
  const nextCount = quotaState.count + 1;
  user.scanQuota = {
    date: quotaState.date,
    count: nextCount,
    max: quotaState.max,
  };
  await user.save();
  const left = Math.max(0, quotaState.max - nextCount);
  return {
    allowed: left > 0,
    left,
    max: quotaState.max,
  };
}

