// migrations/001_add_indexes.js
// Database migration to add indexes for performance

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ScanSession } from '../models/ScanSession.js';
import { Exercise } from '../models/Exercise.js';
import logger from '../utils/logger.js';

export async function up() {
  try {
    logger.info('Running migration: Add indexes');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    logger.info('Created index on User.email');

    // ScanSession indexes
    await ScanSession.collection.createIndex({ user: 1, createdAt: -1 });
    logger.info('Created index on ScanSession.user and createdAt');
    await ScanSession.collection.createIndex({ createdAt: -1 });
    logger.info('Created index on ScanSession.createdAt');

    // Exercise indexes
    await Exercise.collection.createIndex({ slug: 1 }, { unique: true });
    logger.info('Created index on Exercise.slug');
    await Exercise.collection.createIndex({ muscle_group: 1 });
    logger.info('Created index on Exercise.muscle_group');
    await Exercise.collection.createIndex({ level: 1 });
    logger.info('Created index on Exercise.level');

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

export async function down() {
  try {
    logger.info('Rolling back migration: Remove indexes');

    await User.collection.dropIndex('email_1');
    await ScanSession.collection.dropIndex('user_1_createdAt_-1');
    await ScanSession.collection.dropIndex('createdAt_-1');
    await Exercise.collection.dropIndex('slug_1');
    await Exercise.collection.dropIndex('muscle_group_1');
    await Exercise.collection.dropIndex('level_1');

    logger.info('Rollback completed');
  } catch (err) {
    logger.error('Rollback failed', { error: err.message });
    throw err;
  }
}



