import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';
import { User } from '../models/User.js';
import { hashPassword } from '../middleware/auth.js';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Authentication API', () => {
  beforeEach(async () => {
    const passwordHash = await hashPassword('password123');
    await User.create({
      employeeId: 'TEST-001',
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash,
      department: 'Creative',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    
    // Check if cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/auth_token=/);
  });

  it('should fail login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should not allow login for deactivated user', async () => {
    await User.updateOne({ username: 'testuser' }, { status: 'INACTIVE' });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
