import { db } from '../config/database';
import bcrypt from 'bcrypt';

/*
  This is the user service which handles the DB operations on the users table
  This service is currently being used by the authController
*/

export const userService = {
  // This function is used to find a user by email
  async findByEmail(email: string) {
    const result = await db.query('SELECT id, email, name, role FROM users WHERE email = $1', [
      email,
    ]);
    return result.rows[0];
  },

  // This function is used to create a new user
  async create(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at',
      [email, hashedPassword, name]
    );
    return result.rows[0];
  },

  // THis function is used to find a user by email
  async findByEmailWithPassword(email: string) {
    const result = await db.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  // This function is used to find a user by ID
  async findById(id: string) {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // This function is used to update a user
  async update(id: string, name: string) {
    const result = await db.query(
      'UPDATE users SET name = COALESCE($1, name) = COALESCE($2), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, name, role',
      [name, id]
    );
    return result.rows[0];
  },
};
