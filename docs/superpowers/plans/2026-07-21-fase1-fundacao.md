# Fase 1 — Fundação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the conecta-obras monorepo (web + worker + shared db package) with a working
multi-tenant signup/login/vendor-invite flow and a base authenticated layout.

**Architecture:** pnpm workspaces monorepo. `packages/db` holds the Prisma schema and a shared
`PrismaClient` singleton. `apps/web` is a Next.js 14 App Router app with Auth.js v5 (credentials,
JWT sessions) doing all reads/writes scoped by `contaId`. `apps/worker` is a standalone Node.js
process that connects to Upstash Redis via BullMQ and registers one placeholder queue (no real
jobs yet — those come in later phases).

**Tech Stack:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Prisma, PostgreSQL
(Supabase), Auth.js v5 (credentials/JWT), bcrypt, zod, react-hook-form, BullMQ, ioredis (Upstash),
Vitest, pnpm workspaces.

Spec: `docs/superpowers/specs/2026-07-21-fase1-fundacao-design.md`

---

## File Structure

```
conecta-obras/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   ├── auth.ts                          # NextAuth v5 config (credentials, JWT callbacks)
│   │   ├── middleware.ts                    # Route protection
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── api/
│   │   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   │   ├── cadastro/route.ts
│   │   │   │   ├── vendedores/convite/route.ts
│   │   │   │   └── convite/[token]/route.ts
│   │   │   ├── cadastro/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── convite/[token]/page.tsx
│   │   │   └── (app)/
│   │   │       ├── layout.tsx               # AppShell wrapper
│   │   │       ├── dashboard/page.tsx
│   │   │       └── meu-painel/page.tsx
│   │   ├── components/
│   │   │   ├── app-shell.tsx
│   │   │   ├── nav-item.tsx
│   │   │   └── ui/                          # shadcn components (button, input, label, card, badge)
│   │   └── lib/
│   │       ├── session.ts                   # getSessionContext()
│   │       ├── services/
│   │       │   ├── contas.ts                # criarContaComLojista()
│   │       │   └── convites.ts              # gerarConviteVendedor(), aceitarConvite()
│   │       └── __tests__/
│   │           ├── session.test.ts
│   │           ├── contas.test.ts
│   │           └── convites.test.ts
│   └── worker/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── redis.ts                     # ioredis connection (Upstash)
│           ├── queues/ping-queue.ts         # placeholder queue definition
│           └── index.ts                     # worker entrypoint, registers ping worker
└── packages/
    └── db/
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   └── schema.prisma
        └── src/
            └── index.ts                     # PrismaClient singleton export
```

Business logic (`criarContaComLojista`, `gerarConviteVendedor`, `aceitarConvite`) lives in
`apps/web/lib/services/*.ts` as plain functions that take a `PrismaClient` instance as a
parameter — this makes them testable with a mocked client, independent of Next.js request/response
plumbing. API routes are thin wrappers: parse+validate input, call the service, map errors to HTTP
status codes.

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create workspace config**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create root package.json**

`package.json`:
```json
{
  "name": "conecta-obras",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev:web": "pnpm --filter @conecta-obras/web dev",
    "dev:worker": "pnpm --filter @conecta-obras/worker dev",
    "db:generate": "pnpm --filter @conecta-obras/db generate",
    "db:push": "pnpm --filter @conecta-obras/db push",
    "test": "pnpm --filter @conecta-obras/web test"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Create base tsconfig**

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 4: Create env example and gitignore**

`.env.example`:
```
# packages/db
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# apps/web
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# apps/worker
UPSTASH_REDIS_URL="rediss://default:password@your-instance.upstash.io:6379"
```

`.gitignore`:
```
node_modules/
.next/
dist/
.env
.env.local
*.log
.turbo/
```

- [ ] **Step 5: Install pnpm and verify workspace resolves**

Run: `pnpm install`
Expected: completes with no packages yet (workspace globs match nothing), no error.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .env.example .gitignore
git commit -m "chore: scaffold pnpm monorepo"
```

---

## Task 2: packages/db — Prisma schema and client

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create package.json**

`packages/db/package.json`:
```json
{
  "name": "@conecta-obras/db",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "push": "prisma db push",
    "migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig**

`packages/db/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write Prisma schema**

`packages/db/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Conta {
  id          String            @id @default(cuid())
  nomeEmpresa String
  cnpj        String            @unique
  plano       String            @default("trial")
  criadoEm    DateTime          @default(now())
  usuarios    Usuario[]
  convites    ConviteVendedor[]
}

enum Papel {
  LOJISTA
  VENDEDOR
}

enum StatusUsuario {
  ATIVO
  INATIVO
}

model Usuario {
  id        String        @id @default(cuid())
  contaId   String
  conta     Conta         @relation(fields: [contaId], references: [id])
  nome      String
  email     String        @unique
  senhaHash String
  papel     Papel
  status    StatusUsuario @default(ATIVO)
  criadoEm  DateTime      @default(now())

  @@index([contaId])
}

model ConviteVendedor {
  id       String    @id @default(cuid())
  contaId  String
  conta    Conta     @relation(fields: [contaId], references: [id])
  email    String
  token    String    @unique
  aceitoEm DateTime?
  expiraEm DateTime
  criadoEm DateTime  @default(now())

  @@index([contaId])
}
```

- [ ] **Step 4: Create PrismaClient singleton**

`packages/db/src/index.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export * from "@prisma/client";
```

- [ ] **Step 5: Install and generate client**

Run: `pnpm install && pnpm db:generate`
Expected: `Generated Prisma Client` success message, no errors.

- [ ] **Step 6: Push schema to Supabase**

Set `DATABASE_URL` in `packages/db/.env` (copy from Supabase project settings, connection string
with `?pgbouncer=true` disabled for `db push`).

Run: `pnpm db:push`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): add Prisma schema and shared client for Conta/Usuario/ConviteVendedor"
```

---

## Task 3: apps/web — Next.js scaffold + Tailwind + shadcn/ui

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/page.tsx`

- [ ] **Step 1: Create package.json**

`apps/web/package.json`:
```json
{
  "name": "@conecta-obras/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "@conecta-obras/db": "workspace:*",
    "next": "^14.2.0",
    "next-auth": "5.0.0-beta.25",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.446.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create next.config.mjs**

`apps/web/next.config.mjs`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@conecta-obras/db"],
};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig**

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create Tailwind config**

`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

`apps/web/postcss.config.mjs`:
```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create root layout and globals**

`apps/web/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/web/app/layout.tsx`:
```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Conecta Obras",
  description: "Inteligência comercial para construção civil",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
```

- [ ] **Step 6: Install and run dev server to verify boot**

Run: `pnpm install && pnpm --filter @conecta-obras/web dev`
Expected: server starts on `http://localhost:3000`, visiting `/` redirects to `/login` (404 is
fine at this point — `/login` doesn't exist yet — the redirect itself proves the app boots).
Stop the server after verifying.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "chore(web): scaffold Next.js 14 app with Tailwind"
```

---

## Task 4: shadcn/ui base components

**Files:**
- Create: `apps/web/lib/utils.ts`
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/input.tsx`
- Create: `apps/web/components/ui/label.tsx`
- Create: `apps/web/components/ui/card.tsx`
- Create: `apps/web/components/ui/badge.tsx`

- [ ] **Step 1: Create cn() utility**

`apps/web/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Add Button component**

`apps/web/components/ui/button.tsx`:
```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-700",
        outline: "border border-slate-300 hover:bg-slate-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 3: Add Input, Label, Card, Badge components**

`apps/web/components/ui/input.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
```

`apps/web/components/ui/label.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium text-slate-700", className)}
    {...props}
  />
));
Label.displayName = "Label";
```

`apps/web/components/ui/card.tsx`:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pb-2", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);
```

`apps/web/components/ui/badge.tsx`:
```tsx
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/utils.ts apps/web/components/ui
git commit -m "feat(web): add base shadcn/ui components"
```

---

## Task 5: Business logic — criarContaComLojista()

**Files:**
- Create: `apps/web/lib/services/contas.ts`
- Test: `apps/web/lib/__tests__/contas.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/__tests__/contas.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { criarContaComLojista } from "../services/contas";

function mockPrisma() {
  const conta = { id: "conta_1", nomeEmpresa: "Loja X", cnpj: "12345678000199" };
  const usuario = { id: "user_1", contaId: "conta_1", papel: "LOJISTA" };
  return {
    conta: { findUnique: vi.fn().mockResolvedValue(null) },
    usuario: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockImplementation(async (fn: any) =>
      fn({
        conta: { create: vi.fn().mockResolvedValue(conta) },
        usuario: { create: vi.fn().mockResolvedValue(usuario) },
      })
    ),
  } as any;
}

describe("criarContaComLojista", () => {
  it("creates Conta and Usuario(LOJISTA) in a transaction", async () => {
    const prisma = mockPrisma();

    const result = await criarContaComLojista(prisma, {
      nomeEmpresa: "Loja X",
      cnpj: "12345678000199",
      nome: "Ana",
      email: "ana@lojax.com",
      senha: "senha-forte-123",
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result.conta.id).toBe("conta_1");
    expect(result.usuario.papel).toBe("LOJISTA");
  });

  it("throws if email is already in use", async () => {
    const prisma = mockPrisma();
    prisma.usuario.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      criarContaComLojista(prisma, {
        nomeEmpresa: "Loja X",
        cnpj: "12345678000199",
        nome: "Ana",
        email: "ana@lojax.com",
        senha: "senha-forte-123",
      })
    ).rejects.toThrow("EMAIL_EM_USO");
  });

  it("throws if cnpj is already in use", async () => {
    const prisma = mockPrisma();
    prisma.conta.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      criarContaComLojista(prisma, {
        nomeEmpresa: "Loja X",
        cnpj: "12345678000199",
        nome: "Ana",
        email: "ana@lojax.com",
        senha: "senha-forte-123",
      })
    ).rejects.toThrow("CNPJ_EM_USO");
  });
});
```

- [ ] **Step 2: Create vitest config and run test to verify it fails**

`apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: { environment: "node" },
});
```

Run: `pnpm --filter @conecta-obras/web test`
Expected: FAIL — `Cannot find module '../services/contas'`

- [ ] **Step 3: Write minimal implementation**

`apps/web/lib/services/contas.ts`:
```typescript
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@conecta-obras/db";

export interface CriarContaInput {
  nomeEmpresa: string;
  cnpj: string;
  nome: string;
  email: string;
  senha: string;
}

export async function criarContaComLojista(
  prisma: PrismaClient,
  input: CriarContaInput
) {
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: input.email },
  });
  if (emailExistente) {
    throw new Error("EMAIL_EM_USO");
  }

  const cnpjExistente = await prisma.conta.findUnique({
    where: { cnpj: input.cnpj },
  });
  if (cnpjExistente) {
    throw new Error("CNPJ_EM_USO");
  }

  const senhaHash = await bcrypt.hash(input.senha, 10);

  return prisma.$transaction(async (tx) => {
    const conta = await tx.conta.create({
      data: { nomeEmpresa: input.nomeEmpresa, cnpj: input.cnpj },
    });
    const usuario = await tx.usuario.create({
      data: {
        contaId: conta.id,
        nome: input.nome,
        email: input.email,
        senhaHash,
        papel: "LOJISTA",
      },
    });
    return { conta, usuario };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @conecta-obras/web test`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/contas.ts apps/web/lib/__tests__/contas.test.ts apps/web/vitest.config.ts
git commit -m "feat(web): add criarContaComLojista service with tests"
```

---

## Task 6: Business logic — convites de vendedor

**Files:**
- Create: `apps/web/lib/services/convites.ts`
- Test: `apps/web/lib/__tests__/convites.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/__tests__/convites.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { gerarConviteVendedor, aceitarConvite } from "../services/convites";

describe("gerarConviteVendedor", () => {
  it("creates a ConviteVendedor with a token and 7-day expiry", async () => {
    const created = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const prisma = {
      conviteVendedor: { create: vi.fn().mockResolvedValue(created) },
    } as any;

    const result = await gerarConviteVendedor(prisma, {
      contaId: "conta_1",
      email: "vendedor@lojax.com",
    });

    expect(prisma.conviteVendedor.create).toHaveBeenCalledOnce();
    const callArgs = prisma.conviteVendedor.create.mock.calls[0][0];
    expect(callArgs.data.contaId).toBe("conta_1");
    expect(callArgs.data.email).toBe("vendedor@lojax.com");
    expect(typeof callArgs.data.token).toBe("string");
    expect(callArgs.data.token.length).toBeGreaterThan(10);
    expect(result.id).toBe("convite_1");
  });
});

describe("aceitarConvite", () => {
  function mockPrisma(convite: any) {
    return {
      conviteVendedor: {
        findUnique: vi.fn().mockResolvedValue(convite),
        update: vi.fn().mockResolvedValue({ ...convite, aceitoEm: new Date() }),
      },
      usuario: {
        create: vi.fn().mockResolvedValue({ id: "user_2", papel: "VENDEDOR" }),
      },
      $transaction: vi.fn().mockImplementation(async (fn: any) =>
        fn({
          usuario: { create: vi.fn().mockResolvedValue({ id: "user_2", papel: "VENDEDOR" }) },
          conviteVendedor: { update: vi.fn().mockResolvedValue({ aceitoEm: new Date() }) },
        })
      ),
    } as any;
  }

  it("creates a VENDEDOR Usuario and marks the invite accepted", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
    };
    const prisma = mockPrisma(convite);

    const result = await aceitarConvite(prisma, {
      token: "abc123",
      nome: "Bruno",
      senha: "senha-forte-123",
    });

    expect(result.papel).toBe("VENDEDOR");
  });

  it("throws if token does not exist", async () => {
    const prisma = mockPrisma(null);

    await expect(
      aceitarConvite(prisma, { token: "invalido", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_INVALIDO");
  });

  it("throws if invite already accepted", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: new Date(),
      expiraEm: new Date(Date.now() + 60_000),
    };
    const prisma = mockPrisma(convite);

    await expect(
      aceitarConvite(prisma, { token: "abc123", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_JA_ACEITO");
  });

  it("throws if invite is expired", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: null,
      expiraEm: new Date(Date.now() - 60_000),
    };
    const prisma = mockPrisma(convite);

    await expect(
      aceitarConvite(prisma, { token: "abc123", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_EXPIRADO");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @conecta-obras/web test`
Expected: FAIL — `Cannot find module '../services/convites'`

- [ ] **Step 3: Write minimal implementation**

`apps/web/lib/services/convites.ts`:
```typescript
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@conecta-obras/db";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export interface GerarConviteInput {
  contaId: string;
  email: string;
}

export async function gerarConviteVendedor(
  prisma: PrismaClient,
  input: GerarConviteInput
) {
  const token = crypto.randomBytes(24).toString("hex");
  return prisma.conviteVendedor.create({
    data: {
      contaId: input.contaId,
      email: input.email,
      token,
      expiraEm: new Date(Date.now() + SETE_DIAS_MS),
    },
  });
}

export interface AceitarConviteInput {
  token: string;
  nome: string;
  senha: string;
}

export async function aceitarConvite(prisma: PrismaClient, input: AceitarConviteInput) {
  const convite = await prisma.conviteVendedor.findUnique({
    where: { token: input.token },
  });

  if (!convite) {
    throw new Error("CONVITE_INVALIDO");
  }
  if (convite.aceitoEm) {
    throw new Error("CONVITE_JA_ACEITO");
  }
  if (convite.expiraEm.getTime() < Date.now()) {
    throw new Error("CONVITE_EXPIRADO");
  }

  const senhaHash = await bcrypt.hash(input.senha, 10);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        contaId: convite.contaId,
        nome: input.nome,
        email: convite.email,
        senhaHash,
        papel: "VENDEDOR",
      },
    });
    await tx.conviteVendedor.update({
      where: { id: convite.id },
      data: { aceitoEm: new Date() },
    });
    return usuario;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @conecta-obras/web test`
Expected: PASS — all tests green (7 total including Task 5's).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/convites.ts apps/web/lib/__tests__/convites.test.ts
git commit -m "feat(web): add gerarConviteVendedor/aceitarConvite services with tests"
```

---

## Task 7: Auth.js configuration

**Files:**
- Create: `apps/web/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/types/next-auth.d.ts`

- [ ] **Step 1: Extend NextAuth session/JWT types**

`apps/web/types/next-auth.d.ts`:
```typescript
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      contaId: string;
      papel: "LOJISTA" | "VENDEDOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}
```

- [ ] **Step 2: Create auth.ts with credentials provider**

`apps/web/auth.ts`:
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@conecta-obras/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || usuario.status !== "ATIVO") return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          contaId: usuario.contaId,
          papel: usuario.papel,
          name: usuario.nome,
          email: usuario.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.contaId = user.contaId;
        token.papel = user.papel;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.contaId = token.contaId;
      session.user.papel = token.papel;
      return session;
    },
  },
});
```

- [ ] **Step 3: Create route handler**

`apps/web/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Set NEXTAUTH_SECRET locally and verify build**

Run: `openssl rand -base64 32` → copy into `apps/web/.env.local` as `NEXTAUTH_SECRET=`, and set
`NEXTAUTH_URL=http://localhost:3000`.

Run: `pnpm --filter @conecta-obras/web build`
Expected: build succeeds (routes with no UI yet still compile — `/login` page comes in Task 9).

- [ ] **Step 5: Commit**

```bash
git add apps/web/auth.ts apps/web/app/api/auth apps/web/types
git commit -m "feat(web): configure Auth.js credentials provider with contaId/papel in session"
```

---

## Task 8: getSessionContext helper

**Files:**
- Create: `apps/web/lib/session.ts`
- Test: `apps/web/lib/__tests__/session.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/__tests__/session.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import { getSessionContext, ForbiddenError, UnauthorizedError } from "../session";

describe("getSessionContext", () => {
  it("returns userId/contaId/papel from the session", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user_1", contaId: "conta_1", papel: "LOJISTA" },
    });

    const ctx = await getSessionContext();

    expect(ctx).toEqual({ userId: "user_1", contaId: "conta_1", papel: "LOJISTA" });
  });

  it("throws UnauthorizedError when there is no session", async () => {
    (auth as any).mockResolvedValue(null);

    await expect(getSessionContext()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireLojista throws ForbiddenError for a VENDEDOR", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user_2", contaId: "conta_1", papel: "VENDEDOR" },
    });

    const ctx = await getSessionContext();
    expect(() => ctx.requireLojista()).toThrow(ForbiddenError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @conecta-obras/web test`
Expected: FAIL — `Cannot find module '../session'`

- [ ] **Step 3: Write minimal implementation**

`apps/web/lib/session.ts`:
```typescript
import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

export interface SessionContext {
  userId: string;
  contaId: string;
  papel: "LOJISTA" | "VENDEDOR";
  requireLojista: () => void;
}

export async function getSessionContext(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const { id: userId, contaId, papel } = session.user;

  return {
    userId,
    contaId,
    papel,
    requireLojista: () => {
      if (papel !== "LOJISTA") {
        throw new ForbiddenError();
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @conecta-obras/web test`
Expected: PASS — all tests green (10 total).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/session.ts apps/web/lib/__tests__/session.test.ts
git commit -m "feat(web): add getSessionContext with requireLojista guard"
```

---

## Task 9: API routes — cadastro, convite (gerar/aceitar)

**Files:**
- Create: `apps/web/app/api/cadastro/route.ts`
- Create: `apps/web/app/api/vendedores/convite/route.ts`
- Create: `apps/web/app/api/convite/[token]/route.ts`

- [ ] **Step 1: Create cadastro route**

`apps/web/app/api/cadastro/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { criarContaComLojista } from "@/lib/services/contas";

const schema = z.object({
  nomeEmpresa: z.string().min(2),
  cnpj: z.string().min(11).max(18),
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
  }

  try {
    const result = await criarContaComLojista(prisma, parsed.data);
    return NextResponse.json({ ok: true, contaId: result.conta.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_INTERNO";
    const status = message === "EMAIL_EM_USO" || message === "CNPJ_EM_USO" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Create gerar-convite route**

`apps/web/app/api/vendedores/convite/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, ForbiddenError, UnauthorizedError } from "@/lib/session";
import { gerarConviteVendedor } from "@/lib/services/convites";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();
    ctx.requireLojista();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const convite = await gerarConviteVendedor(prisma, {
      contaId: ctx.contaId,
      email: parsed.data.email,
    });

    return NextResponse.json({ token: convite.token }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create aceitar-convite route**

`apps/web/app/api/convite/[token]/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { aceitarConvite } from "@/lib/services/convites";

const schema = z.object({
  nome: z.string().min(2),
  senha: z.string().min(8),
});

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
  }

  try {
    await aceitarConvite(prisma, { token: params.token, ...parsed.data });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_INTERNO";
    const status = message.startsWith("CONVITE_") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @conecta-obras/web build`
Expected: build succeeds, all three routes listed in output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api
git commit -m "feat(web): add cadastro/convite API routes"
```

---

## Task 10: Pages — cadastro, login, aceitar convite

**Files:**
- Create: `apps/web/app/cadastro/page.tsx`
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/convite/[token]/page.tsx`

- [ ] **Step 1: Create cadastro page**

`apps/web/app/cadastro/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  nomeEmpresa: z.string().min(2, "Informe o nome da empresa"),
  cnpj: z.string().min(11, "CNPJ inválido"),
  nome: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setErro(body.error === "EMAIL_EM_USO" ? "Email já cadastrado" : "CNPJ já cadastrado");
      return;
    }

    await signIn("credentials", { email: data.email, senha: data.senha, redirect: false });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta lojista</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
              <Input id="nomeEmpresa" {...register("nomeEmpresa")} />
              {errors.nomeEmpresa && (
                <p className="text-xs text-red-600">{errors.nomeEmpresa.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" {...register("cnpj")} />
              {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" {...register("nome")} />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" {...register("senha")} />
              {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

`apps/web/app/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    const result = await signIn("credentials", {
      email: data.email,
      senha: data.senha,
      redirect: false,
    });

    if (result?.error) {
      setErro("Email ou senha inválidos");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" {...register("senha")} />
              {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Não tem conta?{" "}
              <a href="/cadastro" className="underline">
                Criar conta
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create aceitar-convite page**

`apps/web/app/convite/[token]/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  senha: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function AceitarConvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    const res = await fetch(`/api/convite/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      const mensagens: Record<string, string> = {
        CONVITE_INVALIDO: "Convite não encontrado",
        CONVITE_JA_ACEITO: "Este convite já foi usado",
        CONVITE_EXPIRADO: "Este convite expirou",
      };
      setErro(mensagens[body.error] ?? "Erro ao aceitar convite");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceitar convite</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" {...register("nome")} />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <Label htmlFor="senha">Crie uma senha</Label>
              <Input id="senha" type="password" {...register("senha")} />
              {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Aceitar convite e entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @conecta-obras/web dev`

In browser: go to `/cadastro`, fill form, submit — expect redirect to `/dashboard` (404 is fine,
`/dashboard` comes in Task 12). Check Prisma Studio (`pnpm --filter @conecta-obras/db exec prisma
studio`) to confirm `Conta` and `Usuario` rows were created.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/cadastro apps/web/app/login apps/web/app/convite
git commit -m "feat(web): add cadastro/login/aceitar-convite pages"
```

---

## Task 11: Middleware — route protection

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Write middleware**

`apps/web/middleware.ts`:
```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/cadastro") ||
    req.nextUrl.pathname.startsWith("/convite");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Manual verification**

Run: `pnpm --filter @conecta-obras/web dev`

In browser, logged out: visit `/dashboard` → redirected to `/login`. Log in via `/login` →
redirected to `/dashboard` (404 still fine — page comes next task). Visit `/login` while logged in
→ redirected to `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): add auth middleware for route protection"
```

---

## Task 12: AppShell layout and nav

**Files:**
- Create: `apps/web/components/nav-item.tsx`
- Create: `apps/web/components/app-shell.tsx`
- Create: `apps/web/app/(app)/layout.tsx`

- [ ] **Step 1: Create NavItem**

`apps/web/components/nav-item.tsx`:
```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NavItemProps {
  label: string;
  href: string;
  disabled?: boolean;
}

export function NavItem({ label, href, disabled }: NavItemProps) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400"
      >
        {label}
        <Badge>em breve</Badge>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      )}
    >
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Create AppShell**

`apps/web/components/app-shell.tsx`:
```tsx
import { signOut } from "@/auth";
import { NavItem } from "@/components/nav-item";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", disabled: false },
  { label: "Leads", href: "/leads", disabled: true },
  { label: "CRM", href: "/crm", disabled: true },
  { label: "SDR IA", href: "/sdr-ia", disabled: true },
  { label: "Consulta Plus", href: "/consulta-plus", disabled: true },
  { label: "Busca Avançada", href: "/busca-avancada", disabled: true },
  { label: "Conecta I.A.", href: "/conecta-ia", disabled: true },
  { label: "Meu Painel", href: "/meu-painel", disabled: false },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-4 text-lg font-bold text-slate-900">Conecta Obras</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{userName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create (app) group layout**

`apps/web/app/(app)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <AppShell userName={session.user.name ?? session.user.email ?? ""}>{children}</AppShell>;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/nav-item.tsx apps/web/components/app-shell.tsx "apps/web/app/(app)/layout.tsx"
git commit -m "feat(web): add AppShell layout with nav and em-breve badges"
```

---

## Task 13: Dashboard and Meu Painel pages

**Files:**
- Create: `apps/web/app/(app)/dashboard/page.tsx`
- Create: `apps/web/app/(app)/meu-painel/page.tsx`
- Create: `apps/web/components/convite-vendedor-form.tsx`

- [ ] **Step 1: Create Dashboard stub**

`apps/web/app/(app)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        KPIs de obras e gráficos de ranking chegam na Fase 3.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create client form to generate invite link**

`apps/web/components/convite-vendedor-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().email("Email inválido") });
type FormData = z.infer<typeof schema>;

export function ConviteVendedorForm() {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    setLink(null);
    const res = await fetch("/api/vendedores/convite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      setErro("Não foi possível gerar o convite");
      return;
    }

    const body = await res.json();
    setLink(`${window.location.origin}/convite/${body.token}`);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3">
      <div>
        <Label htmlFor="email">Email do vendedor</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Gerando..." : "Gerar convite"}
      </Button>
      {link && (
        <p className="text-sm text-slate-600">
          Link: <code className="rounded bg-slate-100 px-1">{link}</code>
        </p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Create Meu Painel page**

`apps/web/app/(app)/meu-painel/page.tsx`:
```tsx
import { prisma } from "@conecta-obras/db";
import { getSessionContext } from "@/lib/session";
import { ConviteVendedorForm } from "@/components/convite-vendedor-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MeuPainelPage() {
  const ctx = await getSessionContext();

  const vendedores = await prisma.usuario.findMany({
    where: { contaId: ctx.contaId, papel: "VENDEDOR" },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Meu Painel</h1>

      {ctx.papel === "LOJISTA" && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ConviteVendedorForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vendedores ({vendedores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum vendedor cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {vendedores.map((v) => (
                <li key={v.id} className="py-2 text-sm">
                  {v.nome} — {v.email} ({v.status})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @conecta-obras/web dev`

Logged in as lojista: visit `/dashboard` (renders), visit `/meu-painel`, generate a vendor invite,
copy the link, open it in an incognito window, accept the invite, then log in as that vendor and
confirm `/meu-painel` shows the vendor form hidden (since papel is VENDEDOR) but lists themself.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/dashboard" "apps/web/app/(app)/meu-painel" apps/web/components/convite-vendedor-form.tsx
git commit -m "feat(web): add dashboard stub and meu-painel vendor management"
```

---

## Task 14: apps/worker — BullMQ placeholder

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/redis.ts`
- Create: `apps/worker/src/queues/ping-queue.ts`
- Create: `apps/worker/src/index.ts`

- [ ] **Step 1: Create package.json**

`apps/worker/package.json`:
```json
{
  "name": "@conecta-obras/worker",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "bullmq": "^5.13.0",
    "ioredis": "^5.4.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig**

`apps/worker/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "CommonJS",
    "moduleResolution": "Node"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create Redis connection**

`apps/worker/src/redis.ts`:
```typescript
import IORedis from "ioredis";

const url = process.env.UPSTASH_REDIS_URL;
if (!url) {
  throw new Error("UPSTASH_REDIS_URL não configurada");
}

export const connection = new IORedis(url, {
  maxRetriesPerRequest: null,
});
```

- [ ] **Step 4: Create placeholder ping queue**

`apps/worker/src/queues/ping-queue.ts`:
```typescript
import { Queue, Worker, type Job } from "bullmq";
import { connection } from "../redis";

export const PING_QUEUE_NAME = "ping";

export const pingQueue = new Queue(PING_QUEUE_NAME, { connection });

export function startPingWorker() {
  return new Worker(
    PING_QUEUE_NAME,
    async (job: Job) => {
      console.log(`[ping-worker] processed job ${job.id} with data`, job.data);
      return { pong: true, receivedAt: new Date().toISOString() };
    },
    { connection }
  );
}
```

- [ ] **Step 5: Create entrypoint**

`apps/worker/src/index.ts`:
```typescript
import { startPingWorker } from "./queues/ping-queue";

const worker = startPingWorker();

worker.on("completed", (job) => {
  console.log(`[ping-worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[ping-worker] job ${job?.id} failed`, err);
});

console.log("[worker] conecta-obras worker running, listening on queue: ping");
```

- [ ] **Step 6: Manual verification**

Set `UPSTASH_REDIS_URL` in `apps/worker/.env` (or export in shell).

Run: `pnpm install && pnpm --filter @conecta-obras/worker dev`
Expected: logs `[worker] conecta-obras worker running, listening on queue: ping`, no connection
errors.

In a separate script or `node -e`, enqueue a test job to confirm end-to-end:
```bash
node -e "
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, { maxRetriesPerRequest: null });
const q = new Queue('ping', { connection });
q.add('test', { hello: 'world' }).then(() => process.exit(0));
"
```
Expected: worker log shows `[ping-worker] processed job ... with data { hello: 'world' }` and
`job ... completed`.

- [ ] **Step 7: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): scaffold BullMQ worker with placeholder ping queue"
```

---

## Task 15: Root README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README with setup instructions**

`README.md`:
```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add root README with setup instructions"
```

---

## Task 16: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: all Vitest suites pass (contas, convites, session).

- [ ] **Step 2: Run full build**

Run: `pnpm --filter @conecta-obras/web build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Manual end-to-end walkthrough**

With `pnpm dev:web` running:
1. `/cadastro` → create lojista account → redirected to `/dashboard`.
2. `/meu-painel` → generate vendor invite → copy link.
3. Open link in incognito → accept invite with a password → redirected to `/login`.
4. Log in as the new vendor → `/meu-painel` shows the vendor listed, invite form hidden (not
   LOJISTA).
5. Nav bar shows Leads/CRM/SDR IA/Consulta Plus/Busca Avançada/Conecta I.A. disabled with "em
   breve" badges; Dashboard and Meu Painel clickable.
6. Log out → redirected to `/login`; visiting `/dashboard` while logged out redirects to `/login`.

- [ ] **Step 4: Commit final state if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found in Fase 1 end-to-end verification"
```
(Skip this step if no fixes were needed.)

---

## Self-Review Notes

- **Spec coverage:** repo structure ✅ (Task 1,3,14), schema ✅ (Task 2), auth+authorization ✅
  (Task 7,8,11), layout base with em-breve badges ✅ (Task 12), signup/invite flow ✅ (Task
  5,6,9,10,13), worker placeholder ✅ (Task 14), tests for session/cadastro logic ✅ (Task 5,6,8).
- **Type consistency:** `PrismaClient` type from `@conecta-obras/db` used consistently across
  services; `SessionContext.papel` matches `Papel` enum (`"LOJISTA" | "VENDEDOR"`) used in
  `auth.ts`, `session.ts`, and `next-auth.d.ts`.
- **No placeholders:** all steps contain runnable code; error messages (`EMAIL_EM_USO`,
  `CNPJ_EM_USO`, `CONVITE_INVALIDO`, `CONVITE_JA_ACEITO`, `CONVITE_EXPIRADO`) are defined once in
  services and consumed consistently in routes/UI.
