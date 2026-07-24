import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

function getDatabaseUrl() {
  const possiblePaths = [
    path.join(process.cwd(), 'prisma', 'db', 'custom.db'),
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), '.next', 'standalone', 'prisma', 'db', 'custom.db'),
    path.join(process.cwd(), '.next', 'standalone', 'db', 'custom.db'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return `file:${p}`
    }
  }

  return process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'prisma', 'db', 'custom.db')}`
}

const dbUrl = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db