// migrations/migrate.js
// Simple migration runner

import mongoose from 'mongoose';
import { connectDB } from '../db.js';
import * as migration001 from './001_add_indexes.js';
import logger from '../utils/logger.js';

const migrations = [
  { name: '001_add_indexes', ...migration001 },
];

async function runMigrations() {
  try {
    await connectDB();

    const MigrationRecord = mongoose.model('Migration', new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      appliedAt: { type: Date, default: Date.now },
    }));

    for (const migration of migrations) {
      const existing = await MigrationRecord.findOne({ name: migration.name });
      
      if (existing) {
        logger.info(`Migration ${migration.name} already applied, skipping`);
        continue;
      }

      logger.info(`Running migration: ${migration.name}`);
      await migration.up();

      await MigrationRecord.create({ name: migration.name });
      logger.info(`Migration ${migration.name} completed`);
    }

    logger.info('All migrations completed');
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };



