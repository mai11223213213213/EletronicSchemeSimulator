
import type { Request, Response, NextFunction } from 'express';

import {
  registerUser,
  loginUser,
  createSessionToken,
  getPublicUser,
  getAuthCookieName,
  getAuthCookieOptions,
} from './auth.service';

import {
  registerSchema,
  loginSchema,
} from './auth.validation';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/app-error';

// POST /register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = registerSchema.parse(req.body);

    const user = await registerUser(data);

    const token = createSessionToken(user.id);

    res.cookie(
      getAuthCookieName(),
      token,
      getAuthCookieOptions(),
    );

    return res.status(201).json({
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /login
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await loginUser(data);

    const token = createSessionToken(user.id);

    res.cookie(
      getAuthCookieName(),
      token,
      getAuthCookieOptions(),
    );

    return res.status(200).json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /logout
export function logout(
  _req: Request,
  res: Response,
) {
  res.clearCookie(
    getAuthCookieName(),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  );

  return res.status(200).json({
    message: 'You have successfully logged out of your account',
  });
}

// GET /me
export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.userId) {
      throw new AppError('Authentication required', 401);
    }

    const user = await getPublicUser(req.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}
