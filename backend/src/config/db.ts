import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: resolve(__dirname, '../../.env') })

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function connectDatabase() {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
}