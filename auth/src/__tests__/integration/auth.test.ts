import request from 'supertest';
import { app } from '../setup';

describe('Auth API', () => {
  // Here we are testing the register endpoint
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@test.com');
      expect(response.body.data.token).toBeDefined();
    });

    // If the required fields are missing, then we should return 400
    it('should return 400 if email missing', async () => {
      const response = await request(app).post('/api/auth/register').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    // If the email is invalid format, then we should return 400
    it('should return 400 for invalid email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'invalid',
        password: 'password123',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email format');
    });

    // If the password is less than 8 characters, then we should return 400
    it('should return 400 for invalid password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: 'pass',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 8 characters');
    });
  });

  // Here we are testing the login endpoint
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post('/api/auth/register').send({
        email: 'login@test.com',
        password: 'password123',
        name: 'Login User',
      });
    });

    it('should login successfully', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@test.com');
      expect(response.body.data.token).toBeDefined();
    });

    // If the required fields are missing, then we should return 400
    it('should return 400 if email and password are missing', async () => {
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'login@test.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
