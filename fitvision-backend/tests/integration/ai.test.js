// tests/integration/ai.test.js
// Integration tests for AI service endpoints

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../index.js';
import { User } from '../../models/User.js';
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

describe('AI Service Integration', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'aitest@example.com',
      password_hash: 'hashed_password',
    });

    authToken = jwt.sign(
      { sub: testUser._id.toString() },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
  });

  describe('POST /api/ai/analyze', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake pdf content'), 'test.pdf')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });

    // Note: Full AI integration test would require mocking OpenAI/MediaPipe
    // This is a placeholder for the structure
  });

  describe('POST /api/plan/generate', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/plan/generate')
        .send({ analysis: { score: 70 } })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should accept request body and generate plan with defaults', async () => {
      // The route is permissive and uses defaults for missing fields
      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(200);

      // Should return a plan (either from AI or fallback)
      expect(response.body).toBeDefined();
      expect(response.body.level).toBeDefined();
    });
  });
});



