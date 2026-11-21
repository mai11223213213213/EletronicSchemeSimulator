import { Prisma } from '@prisma/client'

import { prisma } from '../config/db'

const circuitSelect = {
  id: true,
  name: true,
  data: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CircuitSelect

export class CircuitRepository {
  async create(
    userId: string,
    name: string,
    data: Prisma.InputJsonValue,
  ) {
    return prisma.circuit.create({
      data: {
        userId,
        name,
        data,
      },
      select: circuitSelect,
    })
  }

  async findAllByUser(userId: string) {
    return prisma.circuit.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: circuitSelect,
    })
  }

  async findById(id: string, userId: string) {
    return prisma.circuit.findFirst({
      where: { id, userId },
      select: circuitSelect,
    })
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string
      circuitData?: Prisma.InputJsonValue
    },
  ) {
    return prisma.circuit.updateMany({
      where: { id, userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.circuitData !== undefined ? { data: data.circuitData } : {}),
      },
    })
  }

  async delete(id: string, userId: string) {
    return prisma.circuit.deleteMany({
      where: { id, userId },
    })
  }
}

export const circuitRepository = new CircuitRepository()