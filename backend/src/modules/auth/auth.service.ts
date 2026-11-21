
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { userRepository } from '../../repositories/user.repository'
import { AppError } from '../../utils/app-error'

import type {
  RegisterInput,
  LoginInput,
} from './auth.validation'

const TOKEN_TTL = '7d'
const COOKIE_NAME = 'ess_session'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters',
    )
  }

  return secret
}

// Cookie name
export function getAuthCookieName(): string {
  return COOKIE_NAME
}

// Cookie options
export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

// Registration
export async function registerUser(data: RegisterInput) {
  const existingUser = await userRepository.findByEmail(data.email)

  if (existingUser) {
    throw new AppError(
      'The user with this email address already exists',
      409,
    )
  }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await userRepository.create({
    email: data.email,
    passwordHash,
  })

  return user
}

// Login
export async function loginUser(data: LoginInput) {
  const user = await userRepository.findByEmail(data.email)

  if (!user) {
    throw new AppError(
      'Invalid email address or password',
      401,
    )
  }

  const passwordIsValid = await bcrypt.compare(
    data.password,
    user.passwordHash,
  )

  if (!passwordIsValid) {
    throw new AppError(
      'Invalid email address or password',
      401,
    )
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  }
}

// Create JWT
export function createSessionToken(userId: string): string {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      subject: userId,
      expiresIn: TOKEN_TTL,
      algorithm: 'HS256',
    },
  )
}

// Verify JWT
export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    })

    if (typeof payload === 'string' || !payload.sub) {
      return null
    }

    return payload.sub
  } catch {
    return null
  }
}

// Get public user information
export async function getPublicUser(userId: string) {
  return userRepository.findPublicById(userId)
}
