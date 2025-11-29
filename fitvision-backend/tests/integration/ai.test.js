// tests/integration/ai.test.js
// Integration tests for AI service endpoints

import request from 'supertest';
import { app } from '../../index.js';
import { User } from '../../models/User.js';
import jwt from 'jsonwebtoken';

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
    await User.deleteOne({ _id: testUser._id });
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

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});


