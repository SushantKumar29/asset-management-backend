import { userService } from '../../services/userService';
import { pool } from '../setup';

describe('UserService Integration Tests', () => {
  const createTestUser = async (email: string = 'test@test.com', name: string = 'Test User') => {
    return await userService.create(email, 'password123', name);
  };

  describe('register user', () => {
    it('should create a new user', async () => {
      const user = await createTestUser();

      expect(user).toBeDefined();
      expect(user.email).toBe('test@test.com');
      expect(user.name).toBe('Test User');
      expect(user.password).toBeUndefined();

      const result = await pool.query('SELECT * FROM users WHERE email = $1', ['test@test.com']);
      expect(result.rows.length).toBe(1);
    });
  });

  describe('find user by Email', () => {
    it('should find user by email', async () => {
      const createdUser = await createTestUser();
      expect(createdUser).toBeDefined();

      const user = await userService.findByEmail('test@test.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@test.com');
      expect(user?.name).toBe('Test User');
      expect(user?.id).toBe(createdUser.id);
    });

    it('should return undefined for non-existent email', async () => {
      const user = await userService.findByEmail('nonexistent@test.com');
      expect(user).toBeUndefined();
    });
  });

  describe('find user by ID', () => {
    it('should find user by id', async () => {
      const createdUser = await createTestUser();

      const user = await userService.findById(createdUser.id);

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@test.com');
      expect(user?.name).toBe('Test User');
      expect(user?.id).toBe(createdUser.id);
    });

    it('should return undefined for non-existent id', async () => {
      const user = await userService.findById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeUndefined();
    });
  });
});
