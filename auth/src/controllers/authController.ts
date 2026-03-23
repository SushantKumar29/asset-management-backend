import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';
import { validateEmail, validatePassword } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';

export const register = async (req: Request, res: Response, next: Function) => {
  try {
    const { email, password, name } = req.body;

    // Here are some validation for blank fields
    if (!email || !password || !name) {
      throw new AppError('Missing required fields', 400);
    }

    // Here are some validation for email and password
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }

    if (!validatePassword(password)) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    const user = await userService.create(email, password, name);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY } as jwt.SignOptions
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: Function) => {
  try {
    const { email, password } = req.body;

    // Here are some validation for blank fields
    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    const user = await userService.findByEmailWithPassword(email);

    if (!user) {
      throw new AppError('You are not registered yet', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY } as jwt.SignOptions
    );

    delete user.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;

    const user = await userService.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    // Since JWT is stateless, logout is handled client-side by removing the token
    // For simplicity, we just return success

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
