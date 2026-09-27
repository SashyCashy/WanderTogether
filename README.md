# WanderTogether

Monorepo setup: `apps/web` (Vite + React) and `apps/api` (Express + Prisma).

**Requires Node.js 24.x** (see `.nvmrc` — run `nvm use` first if you have nvm). `apps/api` depends on `better-sqlite3`, a native module compiled for the Node version you install it under; if you switch Node versions later, run `npm rebuild --workspace apps/api` (or reinstall).

## Bring-up (fresh clone)

From the repo root:

```
npm install
cp apps/api/.env.example apps/api/.env
```

If `npm install` prints a notice about skipped install scripts (`better-sqlite3`, `esbuild`, `fsevents`, `@prisma/engines`, `prisma`), that's npm's install-scripts approval gate — run `npm install-scripts ls` to see what's pending, or reinstall with `npm install --foreground-scripts` if `apps/api` fails to start with a native-binding error.

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
