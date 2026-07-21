# Fase 1 — Fundação: Design

## Contexto

ConectaObras Clone (nome do projeto provisório: `conecta-obras`) é um SaaS B2B de inteligência
comercial para construção civil. Este documento cobre apenas a **Fase 1 — Fundação**, conforme
escopo definido pelo usuário: setup do projeto, schema Prisma inicial, autenticação e layout base
multi-tenant. As demais fases (base de obras, dashboard/CRM, IA/WhatsApp, cobrança) serão
projetadas separadamente, uma de cada vez, após validação desta.

Stack completa definida no briefing original: Next.js 14+ App Router, TypeScript, TailwindCSS,
shadcn/ui, Prisma + PostgreSQL, Redis + BullMQ, Auth.js (NextAuth), Stripe, OpenAI, WhatsApp
Business API oficial. Fase 1 usa: Next.js, Prisma, PostgreSQL, Auth.js, Redis/BullMQ (worker
placeholder). Stripe, OpenAI e WhatsApp entram em fases posteriores.

## Decisões

- **Banco**: Supabase (Postgres gerenciado).
- **Redis/filas**: Upstash Redis + BullMQ, worker Node.js standalone (não Python).
- **Repo**: monorepo pnpm workspaces.
- **Signup**: self-signup completo (lojista cria conta na hora).
- **Convite de vendedor**: link manual com token (sem envio de email real na Fase 1 — Resend/email
  real entra na Fase 3 junto com redefinição de senha).

## 1. Estrutura do repositório

```
conecta-obras/
├── apps/
│   ├── web/          # Next.js 14 App Router — UI + API routes
│   └── worker/        # Node.js standalone — BullMQ workers
├── packages/
│   └── db/            # Prisma schema + client compartilhado
├── pnpm-workspace.yaml
└── package.json
```

`packages/db` exporta um `PrismaClient` singleton e o schema; `apps/web` e `apps/worker` importam
dele como dependência de workspace. O worker conecta no Redis (Upstash) e registra uma fila de
teste na Fase 1, sem jobs reais — jobs de importação de obras e disparo de campanhas entram nas
fases seguintes.

## 2. Schema Prisma (Fase 1)

Apenas os modelos necessários para fundação. O restante do schema completo do briefing (Obra,
InteracaoObra, SaldoConsulta, ConsultaAvulsa, AgenteSdr, etc.) será desenhado junto com as fases
que os utilizam.

```prisma
model Conta {
  id          String   @id @default(cuid())
  nomeEmpresa String
  cnpj        String   @unique
  plano       String   @default("trial")
  criadoEm    DateTime @default(now())
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
  id        String         @id @default(cuid())
  contaId   String
  conta     Conta          @relation(fields: [contaId], references: [id])
  nome      String
  email     String         @unique
  senhaHash String
  papel     Papel
  status    StatusUsuario  @default(ATIVO)
  criadoEm  DateTime       @default(now())

  @@index([contaId])
}

model ConviteVendedor {
  id        String    @id @default(cuid())
  contaId   String
  conta     Conta     @relation(fields: [contaId], references: [id])
  email     String
  token     String    @unique
  aceitoEm  DateTime?
  expiraEm  DateTime
  criadoEm  DateTime  @default(now())

  @@index([contaId])
}
```

Vendedor aceita convite em `/convite/[token]`, define senha, e vira `Usuario` com `papel=VENDEDOR`
vinculado à mesma `contaId` do convite.

## 3. Autenticação e autorização multi-tenant

- Auth.js (NextAuth) v5, credentials provider (email/senha). Sessão JWT carrega
  `{ userId, contaId, papel }`.
- Senha com hash `bcrypt`.
- `/cadastro`: cria `Conta` + `Usuario(papel=LOJISTA)` em uma transaction.
- `/login`: NextAuth credentials.
- Convite: lojista gera link em `/meu-painel/vendedores` (tela mínima: listar vendedores + gerar
  convite); vendedor acessa `/convite/[token]`, define nome+senha.
- Middleware (`middleware.ts`) valida sessão em rotas protegidas.
- Helper `getSessionContext()` usado em toda API route retorna `{ contaId, papel, userId }`; toda
  query Prisma é escopada com `where: { contaId }`. Rotas exclusivas de lojista (gestão de
  vendedores) checam `papel === 'LOJISTA'`, retornando 403 caso contrário.

## 4. Layout base

`AppShell`: barra superior fixa com logo, nav (Dashboard, Leads, CRM, SDR IA, Consulta Plus, Busca
Avançada, Conecta I.A., Meu Painel), nome do usuário logado e logout.

Fase 1 ativa apenas **Dashboard** e **Meu Painel** (rotas stub). Os demais itens de nav aparecem
com badge "em breve" e estado desabilitado (`aria-disabled`, sem link). Componente `NavItem`
recebe prop `disabled`, reutilizado nas fases seguintes conforme módulos forem ativados.

## Fora de escopo (Fase 1)

- Base de obras (CNO/CAU), busca de leads, dashboard com KPIs reais, CRM, SDR IA/WhatsApp, chat
  Conecta I.A., Stripe/créditos, envio de email real, redefinição de senha via email, testes E2E.
- Distribuição de créditos (SaldoConsulta) — schema entra quando Consulta Plus/Busca Avançada
  forem desenhadas.

## Testes (Fase 1)

Escopo mínimo: testes unitários (Vitest) para o helper `getSessionContext()` e para a criação de
conta+usuário no cadastro. Testes E2E completos ficam para a Fase 5 conforme briefing original.
