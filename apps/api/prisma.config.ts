import { defineConfig } from 'prisma/config';
import { config } from './src/shared/config.js';

// Prisma 7 CLI config: tells `prisma migrate`/`prisma generate`/`prisma
// studio` where the schema lives and which DATABASE_URL to use. Loaded
// automatically by the Prisma CLI when run from apps/api.
//
// Reads `databaseUrl` from the shared config module rather than
// `process.env` directly, so there's exactly one place resolving that
// value (Consistency Conventions: "one typed config module").
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: config.databaseUrl,
  },
});
