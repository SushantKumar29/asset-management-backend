import { db } from '../config/database';
import bcrypt from 'bcrypt';

export const userService = {
  async findByEmail(email: string) {
    const result = await db.query('SELECT id, email, name, role FROM users WHERE email = $1', [
      email,
    ]);
    return result.rows[0];
  },

  async create(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at',
      [email, hashedPassword, name]
    );
    return result.rows[0];
  },

  async findByEmailWithPassword(email: string) {
    const result = await db.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id: string, name: string) {
    const result = await db.query(
      'UPDATE users SET name = COALESCE($1, name) = COALESCE($2), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, name, role',
      [name, id]
    );
    return result.rows[0];
  },
};
