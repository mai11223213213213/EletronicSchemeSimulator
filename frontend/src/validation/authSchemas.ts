
import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email must not exceed 254 characters')
  .transform((value) => value.toLowerCase())

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(72, 'Password must not exceed 72 characters')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password must contain at least 8 characters')
      .max(72, 'Password must not exceed 72 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  )

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
