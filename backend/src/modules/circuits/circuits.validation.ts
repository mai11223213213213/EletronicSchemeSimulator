import { z } from 'zod'

const jsonObjectSchema = z.record(z.string(), z.unknown())

export const circuitDataSchema = z.object({
  elements: z.array(jsonObjectSchema),
  wires: z.array(jsonObjectSchema),
  junctions: z.array(jsonObjectSchema),
})

export const createCircuitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Circuit name is required')
    .max(100, 'Circuit name must not exceed 100 characters')
    .default('Untitled circuit'),
  data: circuitDataSchema.optional().default({
    elements: [],
    wires: [],
    junctions: [],
  }),
})

export const updateCircuitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Circuit name is required')
    .max(100, 'Circuit name must not exceed 100 characters')
    .optional(),
  data: circuitDataSchema.optional(),
}).refine(
  (value) => value.name !== undefined || value.data !== undefined,
  'At least one field must be provided',
)

export type CreateCircuitInput = z.infer<typeof createCircuitSchema>
export type UpdateCircuitInput = z.infer<typeof updateCircuitSchema>