# WanderTogether

Monorepo setup: `apps/web` (Vite + React) and `apps/api` (Express + Prisma).

## Bring-up (fresh clone)

From the repo root:

```
npm install
cp apps/api/.env.example apps/api/.env
```

From `apps/api`:

```
npx prisma migrate dev
npx tsx prisma/seed.ts
```

From the repo root, in two terminals:

```
npm run dev:web
npm run dev:api
```
