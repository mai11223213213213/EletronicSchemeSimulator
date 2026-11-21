import { Prisma } from '@prisma/client'

import { circuitRepository } from '../../repositories/circuits.repository'
import { AppError } from '../../utils/app-error'

import type {
  CreateCircuitInput,
  UpdateCircuitInput,
} from './circuits.validation'

export async function createCircuit(
  userId: string,
  input: CreateCircuitInput,
) {
  return circuitRepository.create(
    userId,
    input.name,
    input.data as Prisma.InputJsonValue,
  )
}

export async function getUserCircuits(userId: string) {
  return circuitRepository.findAllByUser(userId)
}

export async function getCircuit(id: string, userId: string) {
  const circuit = await circuitRepository.findById(id, userId)

  if (!circuit) {
    throw new AppError('Circuit not found', 404)
  }

  return circuit
}

export async function updateCircuit(
  id: string,
  userId: string,
  input: UpdateCircuitInput,
) {
  const result = await circuitRepository.update(id, userId, {
    name: input.name,
    circuitData: input.data as Prisma.InputJsonValue | undefined,
  })

  if (result.count === 0) {
    throw new AppError('Circuit not found', 404)
  }

  return getCircuit(id, userId)
}

export async function deleteCircuit(id: string, userId: string) {
  const result = await circuitRepository.delete(id, userId)

  if (result.count === 0) {
    throw new AppError('Circuit not found', 404)
  }
}