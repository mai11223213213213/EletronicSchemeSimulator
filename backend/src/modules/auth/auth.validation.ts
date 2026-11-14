import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(254, 'Email must not exceed 254 characters')
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .max(72, 'Password must not exceed 72 characters'),
})

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(254, 'Email must not exceed 254 characters')
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, 'Password is required')
    .max(72, 'Invalid password'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>