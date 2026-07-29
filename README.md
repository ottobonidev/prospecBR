# Conecta Obras

SaaS B2B de inteligência comercial para construção civil. Ver spec da Fase 1 em
`docs/superpowers/specs/2026-07-21-fase1-fundacao-design.md`.

## Setup

1. `pnpm install`
2. Copie `.env.example` para `.env` em `packages/db`, `apps/web` e `apps/worker`, preenchendo:
   - `DATABASE_URL` (Supabase Postgres connection string)
   - `NEXTAUTH_SECRET` (gerar com `openssl rand -base64 32`) e `NEXTAUTH_URL`
   - `UPSTASH_REDIS_URL` (Upstash Redis connection string)
3. `pnpm db:generate && pnpm db:push`
4. `pnpm dev:web` (Next.js em http://localhost:3000)
5. `pnpm dev:worker` (worker BullMQ)

## Testes

`pnpm test` — testes unitários (Vitest) dos services em `apps/web/lib/services`.

## Estrutura

- `apps/web` — Next.js 14 App Router, Auth.js, UI.
- `apps/worker` — Node.js, BullMQ, jobs assíncronos.
- `packages/db` — schema Prisma compartilhado + client.
