
import type { Response, NextFunction } from 'express'

import type { AuthenticatedRequest } from '../../middleware/auth.middleware'
import { AppError } from '../../utils/app-error'

import {
  createCircuit,
  getUserCircuits,
  getCircuit,
  updateCircuit,
  deleteCircuit,
} from './circuits.service'

import {
  createCircuitSchema,
  updateCircuitSchema,
} from './circuits.validation'

function getUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new AppError('Authentication required', 401)
  }

  return req.userId
}

function getCircuitId(req: AuthenticatedRequest): string {
  const id = req.params.id

  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError('Invalid circuit ID', 400)
  }

  return id
}

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = createCircuitSchema.parse(req.body)
    const circuit = await createCircuit(getUserId(req), input)

    return res.status(201).json({ circuit })
  } catch (error) {
    return next(error)
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const circuits = await getUserCircuits(getUserId(req))

    return res.status(200).json({ circuits })
  } catch (error) {
    return next(error)
  }
}

export async function getOne(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const circuit = await getCircuit(
      getCircuitId(req),
      getUserId(req),
    )

    return res.status(200).json({ circuit })
  } catch (error) {
    return next(error)
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = updateCircuitSchema.parse(req.body)

    const circuit = await updateCircuit(
      getCircuitId(req),
      getUserId(req),
      input,
    )

    return res.status(200).json({ circuit })
  } catch (error) {
    return next(error)
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await deleteCircuit(
      getCircuitId(req),
      getUserId(req),
    )

    return res.status(200).json({
      message: 'Circuit deleted successfully',
    })
  } catch (error) {
    return next(error)
  }
}
