import { z } from 'zod'

export const circuitNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Circuit name is required')
    .max(60, 'Circuit name must not exceed 60 characters'),
})

export type CircuitNameValues = z.infer<typeof circuitNameSchema>