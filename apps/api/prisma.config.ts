import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 CLI config: tells `prisma migrate`/`prisma generate`/`prisma
// studio` where the schema lives and which DATABASE_URL to use. Loaded
// automatically by the Prisma CLI when run from apps/api.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  },
});
