
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../../config/db';
import { AppError } from '../../utils/app-error';

import type {
  RegisterInput,
  LoginInput,
} from './auth.validation';

const TOKEN_TTL = '7d';
const COOKIE_NAME = 'ess_session';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters',
    );
  }

  return secret;
}

// Назва cookie
export function getAuthCookieName(): string {
  return COOKIE_NAME;
}

// Налаштування cookie
export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// Реєстрація
export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new AppError(
      'Користувач із такою email-адресою вже існує',
      409,
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
}

// Авторизація
export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new AppError(
      'Неправильна email-адреса або пароль',
      401,
    );
  }

  const passwordIsValid = await bcrypt.compare(
    data.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    throw new AppError(
      'Неправильна email-адреса або пароль',
      401,
    );
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

// Створення JWT
export function createSessionToken(userId: string): string {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      subject: userId,
      expiresIn: TOKEN_TTL,
      algorithm: 'HS256',
    },
  );
}

// Перевірка JWT
export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (typeof payload === 'string' || !payload.sub) {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
}

// Отримання публічної інформації про користувача
export async function getPublicUser(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });
}
