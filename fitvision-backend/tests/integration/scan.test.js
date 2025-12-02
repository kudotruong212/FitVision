// tests/integration/scan.test.js
// Integration tests for scan flow

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../index.js';
import { User } from '../../models/User.js';
import { ScanSession } from '../../models/ScanSession.js';
import { connectDB, disconnectDB } from '../../db.js';
import jwt from 'jsonwebtoken';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

describe('Scan Flow Integration', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      email: 'scantest@example.com',
      password_hash: 'hashed_password',
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString() },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    if (testUser) {
      await ScanSession.deleteMany({ user: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
  });

  describe('POST /api/scan/save', () => {
    it('should save scan session', async () => {
      const analysis = {
        score: 75,
        posture: 'Good',
        weak_muscles: ['back'],
        fat_area: 'belly',
      };

      const response = await request(app)
        .post('/api/scan/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ analysis })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.id).toBeDefined();

      // Verify it was saved
      const saved = await ScanSession.findById(response.body.id);
      expect(saved).toBeDefined();
      expect(saved.score).toBe(75);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/scan/save')
        .send({ analysis: { score: 70 } })
        .expect(401);
    });
  });

  describe('GET /api/scan/history', () => {
    it('should return user scan history', async () => {
      // Create test scan
      await ScanSession.create({
        user: testUser._id,
        score: 80,
        posture: 'Excellent',
      });

      const response = await request(app)
        .get('/api/scan/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});



