
import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Вкажіть коректну email-адресу')
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .max(72, 'Пароль не може бути довшим за 72 символи'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Вкажіть коректну email-адресу')
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, 'Введіть пароль')
    .max(72, 'Некоректний пароль'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
