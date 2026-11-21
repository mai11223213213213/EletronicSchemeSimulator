
import { Prisma } from '@prisma/client'

import { prisma } from '../config/db'

const publicUserSelect = {
  id: true,
  email: true,
  createdAt: true,
} satisfies Prisma.UserSelect

const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    })
  }

  async create(data: {
    email: string
    passwordHash: string
  }) {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    })
  }

  async findPublicById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    })
  }
}

export const userRepository = new UserRepository()
