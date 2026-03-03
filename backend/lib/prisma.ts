import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const caPem = process.env.CA_PEM;

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 30000,
  ...(caPem
    ? {
        ssl: {
          ca: caPem,
          rejectUnauthorized: true,
        },
      }
    : {}),
});
const prisma = new PrismaClient({ adapter });

export { prisma };
