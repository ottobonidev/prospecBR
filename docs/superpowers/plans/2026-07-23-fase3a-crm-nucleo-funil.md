# Fase 3a — CRM núcleo do funil (acompanhar + agendar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ativar as ações de card `acompanhar` (🏷) e `agendar` (📅) do módulo Leads, persistindo o funil de vendas (status/temperatura/probabilidade/anotações) e agendamentos por vendedor.

**Architecture:** Dois modelos Prisma novos (`Acompanhamento` único por `(usuarioId, obraId)`, `Agendamento` múltiplo por obra), dois serviços puros testados com mocks de prisma, três rotas Next no padrão das rotas favoritar/ocultar, e dois modais laterais que reaproveitam a estrutura de `FiltrosAvancadosModal`. Os botões 📅/🏷, hoje `disabled`, passam a abrir os modais.

**Tech Stack:** Igual à Fase 2.5 — Next.js 14, Prisma 5, Vitest, Zod, React client components. Base: branch `feature/fase1-fundacao`.

**Spec:** `docs/superpowers/specs/2026-07-23-fase3a-crm-nucleo-funil-design.md`

---

## Task 1: Prisma schema — enums Acompanhamento/Temperatura e modelos

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Adicionar os dois enums**

Anexar em `packages/db/prisma/schema.prisma` (após o enum `TipoResponsavel`):

```prisma
enum StatusAcompanhamento {
  SELECAO
  CONTATO
  NAO_RESPONDEU
  RESPONDEU
  ORCAMENTO
  A_FECHAR
  FECHADO
  PERDIDO
  JA_COMPROU
  NAO_QUER_RECEBER_MENSAGEM
  OUTROS
}

enum TemperaturaLead {
  MUITO_QUENTE
  QUENTE
  MORNA
  FRIA
}
```

- [ ] **Step 2: Adicionar os dois modelos**

Adicionar em `packages/db/prisma/schema.prisma` (após o model `ObraOculta`):

```prisma
model Acompanhamento {
  id            String               @id @default(cuid())
  contaId       String
  conta         Conta                @relation(fields: [contaId], references: [id])
  usuarioId     String
  usuario       Usuario              @relation(fields: [usuarioId], references: [id])
  obraId        String
  obra          Obra                 @relation(fields: [obraId], references: [id])
  status        StatusAcompanhamento
  temperatura   TemperaturaLead?
  probabilidade Int?
  anotacoes     String?
  criadoEm      DateTime             @default(now())
  atualizadoEm  DateTime             @updatedAt

  @@unique([usuarioId, obraId])
  @@index([contaId, status])
}

model Agendamento {
  id        String   @id @default(cuid())
  contaId   String
  conta     Conta    @relation(fields: [contaId], references: [id])
  usuarioId String
  usuario   Usuario  @relation(fields: [usuarioId], references: [id])
  obraId    String
  obra      Obra     @relation(fields: [obraId], references: [id])
  dataHora  DateTime
  titulo    String
  descricao String?
  criadoEm  DateTime @default(now())

  @@index([usuarioId, dataHora])
  @@index([contaId])
}
```

- [ ] **Step 3: Adicionar back-relations em Conta, Usuario e Obra**

Em `Conta`, adicionar ao bloco de relações (junto de `obraFavoritos` etc., se existir, ou das relações de crédito):

```prisma
  acompanhamentos Acompanhamento[]
  agendamentos    Agendamento[]
```

Em `Usuario`, adicionar junto de `obraFavoritos`/`obraOcultas`:

```prisma
  acompanhamentos Acompanhamento[]
  agendamentos    Agendamento[]
```

Em `Obra`, adicionar junto de `favoritos`/`ocultas`:

```prisma
  acompanhamentos Acompanhamento[]
  agendamentos    Agendamento[]
```

- [ ] **Step 4: Aplicar no banco e regenerar o client**

Run (a partir da raiz do worktree): `pnpm db:push`
Expected: "Your database is now in sync with your Prisma schema" (ou "already in sync" + as duas tabelas criadas) e "Generated Prisma Client".

Se o comando de alteração de schema for bloqueado no ambiente, peça ao usuário para rodar
`pnpm db:push` manualmente e prosseguir só depois de confirmado.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add Acompanhamento and Agendamento models with funnel enums"
```

---

## Task 2: `lib/services/obraAcompanhamento.ts` — salvar (upsert) e buscar

**Files:**
- Create: `apps/web/lib/services/obraAcompanhamento.ts`
- Test: `apps/web/lib/__tests__/obraAcompanhamento.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create `apps/web/lib/__tests__/obraAcompanhamento.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  salvarAcompanhamento,
  buscarAcompanhamento,
} from "../services/obraAcompanhamento";

describe("salvarAcompanhamento", () => {
  it("faz upsert por (usuarioId, obraId) com o payload completo", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "acomp_1" });
    const prisma = { acompanhamento: { upsert } } as any;

    const resultado = await salvarAcompanhamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_1",
      status: "CONTATO",
      temperatura: "QUENTE",
      probabilidade: 75,
      anotacoes: "ligou, retornar terça",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_1" } },
      create: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_1",
        status: "CONTATO",
        temperatura: "QUENTE",
        probabilidade: 75,
        anotacoes: "ligou, retornar terça",
      },
      update: {
        status: "CONTATO",
        temperatura: "QUENTE",
        probabilidade: 75,
        anotacoes: "ligou, retornar terça",
      },
    });
    expect(resultado).toEqual({ id: "acomp_1" });
  });

  it("passa null nos campos opcionais quando ausentes", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "acomp_2" });
    const prisma = { acompanhamento: { upsert } } as any;

    await salvarAcompanhamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_2",
      status: "SELECAO",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_2" } },
      create: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_2",
        status: "SELECAO",
        temperatura: null,
        probabilidade: null,
        anotacoes: null,
      },
      update: {
        status: "SELECAO",
        temperatura: null,
        probabilidade: null,
        anotacoes: null,
      },
    });
  });
});

describe("buscarAcompanhamento", () => {
  it("retorna o registro existente do vendedor para a obra", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "acomp_1", status: "CONTATO" });
    const prisma = { acompanhamento: { findUnique } } as any;

    const resultado = await buscarAcompanhamento(prisma, {
      usuarioId: "user_1",
      obraId: "obra_1",
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_1" } },
    });
    expect(resultado).toEqual({ id: "acomp_1", status: "CONTATO" });
  });

  it("retorna null quando não há acompanhamento", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { acompanhamento: { findUnique } } as any;

    const resultado = await buscarAcompanhamento(prisma, {
      usuarioId: "user_1",
      obraId: "obra_x",
    });

    expect(resultado).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `cd apps/web && npx vitest run lib/__tests__/obraAcompanhamento.test.ts`
Expected: FAIL com `Cannot find module '../services/obraAcompanhamento'`.

- [ ] **Step 3: Implementar**

Create `apps/web/lib/services/obraAcompanhamento.ts`:

```typescript
import type {
  PrismaClient,
  StatusAcompanhamento,
  TemperaturaLead,
} from "@conecta-obras/db";

export interface SalvarAcompanhamentoInput {
  usuarioId: string;
  contaId: string;
  obraId: string;
  status: StatusAcompanhamento;
  temperatura?: TemperaturaLead | null;
  probabilidade?: number | null;
  anotacoes?: string | null;
}

export async function salvarAcompanhamento(
  prisma: PrismaClient,
  input: SalvarAcompanhamentoInput
) {
  const campos = {
    status: input.status,
    temperatura: input.temperatura ?? null,
    probabilidade: input.probabilidade ?? null,
    anotacoes: input.anotacoes ?? null,
  };

  return prisma.acompanhamento.upsert({
    where: { usuarioId_obraId: { usuarioId: input.usuarioId, obraId: input.obraId } },
    create: {
      contaId: input.contaId,
      usuarioId: input.usuarioId,
      obraId: input.obraId,
      ...campos,
    },
    update: { ...campos },
  });
}

export async function buscarAcompanhamento(
  prisma: PrismaClient,
  input: { usuarioId: string; obraId: string }
) {
  return prisma.acompanhamento.findUnique({
    where: { usuarioId_obraId: { usuarioId: input.usuarioId, obraId: input.obraId } },
  });
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `cd apps/web && npx vitest run lib/__tests__/obraAcompanhamento.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/obraAcompanhamento.ts apps/web/lib/__tests__/obraAcompanhamento.test.ts
git commit -m "feat: add salvarAcompanhamento (upsert) and buscarAcompanhamento services"
```

---

## Task 3: `lib/services/obraAgendamento.ts` — criar

**Files:**
- Create: `apps/web/lib/services/obraAgendamento.ts`
- Test: `apps/web/lib/__tests__/obraAgendamento.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Create `apps/web/lib/__tests__/obraAgendamento.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { criarAgendamento } from "../services/obraAgendamento";

describe("criarAgendamento", () => {
  it("cria um agendamento com o payload completo", async () => {
    const create = vi.fn().mockResolvedValue({ id: "agend_1" });
    const prisma = { agendamento: { create } } as any;

    const dataHora = new Date("2026-08-01T14:30:00.000Z");
    const resultado = await criarAgendamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_1",
      dataHora,
      titulo: "Visita técnica",
      descricao: "levar catálogo",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_1",
        dataHora,
        titulo: "Visita técnica",
        descricao: "levar catálogo",
      },
    });
    expect(resultado).toEqual({ id: "agend_1" });
  });

  it("passa descricao null quando ausente", async () => {
    const create = vi.fn().mockResolvedValue({ id: "agend_2" });
    const prisma = { agendamento: { create } } as any;

    const dataHora = new Date("2026-08-02T09:00:00.000Z");
    await criarAgendamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_2",
      dataHora,
      titulo: "Ligar",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_2",
        dataHora,
        titulo: "Ligar",
        descricao: null,
      },
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `cd apps/web && npx vitest run lib/__tests__/obraAgendamento.test.ts`
Expected: FAIL com `Cannot find module '../services/obraAgendamento'`.

- [ ] **Step 3: Implementar**

Create `apps/web/lib/services/obraAgendamento.ts`:

```typescript
import type { PrismaClient } from "@conecta-obras/db";

export interface CriarAgendamentoInput {
  usuarioId: string;
  contaId: string;
  obraId: string;
  dataHora: Date;
  titulo: string;
  descricao?: string | null;
}

export async function criarAgendamento(
  prisma: PrismaClient,
  input: CriarAgendamentoInput
) {
  return prisma.agendamento.create({
    data: {
      contaId: input.contaId,
      usuarioId: input.usuarioId,
      obraId: input.obraId,
      dataHora: input.dataHora,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
    },
  });
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `cd apps/web && npx vitest run lib/__tests__/obraAgendamento.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/obraAgendamento.ts apps/web/lib/__tests__/obraAgendamento.test.ts
git commit -m "feat: add criarAgendamento service"
```

---

## Task 4: Rotas — acompanhar (POST + GET) e agendar (POST)

**Files:**
- Create: `apps/web/app/api/leads/acompanhar/route.ts`
- Create: `apps/web/app/api/leads/agendar/route.ts`

- [ ] **Step 1: Criar a rota de acompanhar (POST salva, GET busca)**

Create `apps/web/app/api/leads/acompanhar/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prisma,
  StatusAcompanhamento,
  TemperaturaLead,
} from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import {
  salvarAcompanhamento,
  buscarAcompanhamento,
} from "@/lib/services/obraAcompanhamento";

const postSchema = z.object({
  obraId: z.string().min(1),
  status: z.nativeEnum(StatusAcompanhamento),
  temperatura: z.nativeEnum(TemperaturaLead).nullish(),
  probabilidade: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(90)]).nullish(),
  anotacoes: z.string().nullish(),
});

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const acompanhamento = await salvarAcompanhamento(prisma, {
      usuarioId: ctx.userId,
      contaId: ctx.contaId,
      obraId: parsed.data.obraId,
      status: parsed.data.status,
      temperatura: parsed.data.temperatura,
      probabilidade: parsed.data.probabilidade,
      anotacoes: parsed.data.anotacoes,
    });

    return NextResponse.json(acompanhamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get("obraId");

    if (!obraId) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const acompanhamento = await buscarAcompanhamento(prisma, {
      usuarioId: ctx.userId,
      obraId,
    });

    return NextResponse.json(acompanhamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Criar a rota de agendar (POST)**

Create `apps/web/app/api/leads/agendar/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import { criarAgendamento } from "@/lib/services/obraAgendamento";

const schema = z.object({
  obraId: z.string().min(1),
  dataHora: z.coerce.date(),
  titulo: z.string().min(1),
  descricao: z.string().nullish(),
});

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const agendamento = await criarAgendamento(prisma, {
      usuarioId: ctx.userId,
      contaId: ctx.contaId,
      obraId: parsed.data.obraId,
      dataHora: parsed.data.dataHora,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
    });

    return NextResponse.json(agendamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sem erros. Se os enums `StatusAcompanhamento`/`TemperaturaLead` não forem reconhecidos
em `@conecta-obras/db`, confirme que o `pnpm db:push`/generate da Task 1 rodou neste worktree.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/leads/acompanhar/route.ts apps/web/app/api/leads/agendar/route.ts
git commit -m "feat: add acompanhar (POST/GET) and agendar (POST) routes"
```

---

## Task 5: Modais — Acompanhamento e Agendamento

**Files:**
- Create: `apps/web/components/acompanhamento-modal.tsx`
- Create: `apps/web/components/agendamento-modal.tsx`

- [ ] **Step 1: Criar o AcompanhamentoModal**

Create `apps/web/components/acompanhamento-modal.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface AcompanhamentoValor {
  status: string;
  temperatura: string | null;
  probabilidade: number | null;
  anotacoes: string | null;
}

const STATUS = [
  "SELECAO",
  "CONTATO",
  "NAO_RESPONDEU",
  "RESPONDEU",
  "ORCAMENTO",
  "A_FECHAR",
  "FECHADO",
  "PERDIDO",
  "JA_COMPROU",
  "NAO_QUER_RECEBER_MENSAGEM",
  "OUTROS",
];
const TEMPERATURAS = ["MUITO_QUENTE", "QUENTE", "MORNA", "FRIA"];
const PROBABILIDADES = [0, 25, 50, 75, 90];

const VAZIO: AcompanhamentoValor = {
  status: "SELECAO",
  temperatura: null,
  probabilidade: null,
  anotacoes: null,
};

export function AcompanhamentoModal({
  aberto,
  inicial,
  onSalvar,
  onFechar,
}: {
  aberto: boolean;
  inicial: AcompanhamentoValor | null;
  onSalvar: (valor: AcompanhamentoValor) => void;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState<AcompanhamentoValor>(VAZIO);

  useEffect(() => {
    if (aberto) setValor(inicial ?? VAZIO);
  }, [aberto, inicial]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-black/20" onClick={onFechar}>
      <div
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Acompanhamento</h2>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Anotações</p>
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
            value={valor.anotacoes ?? ""}
            onChange={(e) => setValor({ ...valor, anotacoes: e.target.value || null })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Status</p>
          <div className="flex flex-wrap gap-1">
            {STATUS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValor({ ...valor, status: s })}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.status === s
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {s.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Temperatura</p>
          <div className="flex flex-wrap gap-1">
            {TEMPERATURAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setValor({ ...valor, temperatura: valor.temperatura === t ? null : t })
                }
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.temperatura === t
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {t.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Probabilidade</p>
          <div className="flex flex-wrap gap-1">
            {PROBABILIDADES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setValor({ ...valor, probabilidade: valor.probabilidade === p ? null : p })
                }
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.probabilidade === p
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onSalvar(valor)}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar o AgendamentoModal**

Create `apps/web/components/agendamento-modal.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AgendamentoValor {
  data: string;
  hora: string;
  titulo: string;
  descricao: string;
}

const VAZIO: AgendamentoValor = { data: "", hora: "", titulo: "", descricao: "" };

export function AgendamentoModal({
  aberto,
  onCriar,
  onFechar,
}: {
  aberto: boolean;
  onCriar: (valor: AgendamentoValor) => void;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState<AgendamentoValor>(VAZIO);

  useEffect(() => {
    if (aberto) setValor(VAZIO);
  }, [aberto]);

  if (!aberto) return null;

  const podeSalvar = valor.data && valor.hora && valor.titulo.trim();

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-black/20" onClick={onFechar}>
      <div
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Novo agendamento</h2>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="agend-data">Data</Label>
            <Input
              id="agend-data"
              type="date"
              value={valor.data}
              onChange={(e) => setValor({ ...valor, data: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="agend-hora">Hora</Label>
            <Input
              id="agend-hora"
              type="time"
              value={valor.hora}
              onChange={(e) => setValor({ ...valor, hora: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="agend-titulo">Título</Label>
          <Input
            id="agend-titulo"
            value={valor.titulo}
            onChange={(e) => setValor({ ...valor, titulo: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Descrição</p>
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
            value={valor.descricao}
            onChange={(e) => setValor({ ...valor, descricao: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" disabled={!podeSalvar} onClick={() => onCriar(valor)}>
            Criar Agendamento
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/acompanhamento-modal.tsx apps/web/components/agendamento-modal.tsx
git commit -m "feat: add acompanhamento and agendamento modals"
```

---

## Task 6: Wire — ativar 📅/🏷 no card e badge de status

**Files:**
- Modify: `apps/web/components/leads-search-form.tsx`

Leia o arquivo atual antes de editar. Ele já tem os handlers `favoritar`/`ocultar`, a interface
`Obra` e a lista de cards com os quatro botões (📅 e 🏷 hoje `disabled` com título "Disponível no
CRM"). Preserve busca/filtros/paginação/CSV.

- [ ] **Step 1: Adicionar imports dos modais**

No topo, junto dos outros imports de componentes:

```typescript
import { AcompanhamentoModal, type AcompanhamentoValor } from "@/components/acompanhamento-modal";
import { AgendamentoModal, type AgendamentoValor } from "@/components/agendamento-modal";
```

- [ ] **Step 2: Adicionar estado dos modais e do badge**

Dentro de `LeadsSearchForm`, junto dos outros `useState`:

```typescript
  const [acompanharObraId, setAcompanharObraId] = useState<string | null>(null);
  const [acompInicial, setAcompInicial] = useState<AcompanhamentoValor | null>(null);
  const [agendarObraId, setAgendarObraId] = useState<string | null>(null);
  const [statusPorObra, setStatusPorObra] = useState<
    Record<string, { status: string; temperatura: string | null }>
  >({});
```

- [ ] **Step 3: Adicionar os handlers**

Dentro de `LeadsSearchForm`, junto de `favoritar`/`ocultar`:

```typescript
  async function abrirAcompanhar(obraId: string) {
    setAcompInicial(null);
    setAcompanharObraId(obraId);
    try {
      const res = await fetch(`/api/leads/acompanhar?obraId=${obraId}`);
      if (res.ok) {
        const dados = await res.json();
        if (dados) {
          setAcompInicial({
            status: dados.status,
            temperatura: dados.temperatura ?? null,
            probabilidade: dados.probabilidade ?? null,
            anotacoes: dados.anotacoes ?? null,
          });
        }
      }
    } catch {
      // mantém o modal com valores padrão se a busca falhar
    }
  }

  async function salvarAcompanhamento(valor: AcompanhamentoValor) {
    const obraId = acompanharObraId;
    if (!obraId) return;
    const res = await fetch("/api/leads/acompanhar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obraId, ...valor }),
    });
    if (res.ok) {
      setStatusPorObra((atual) => ({
        ...atual,
        [obraId]: { status: valor.status, temperatura: valor.temperatura },
      }));
    }
    setAcompanharObraId(null);
  }

  async function criarAgendamento(valor: AgendamentoValor) {
    const obraId = agendarObraId;
    if (!obraId) return;
    await fetch("/api/leads/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obraId,
        dataHora: new Date(`${valor.data}T${valor.hora}`).toISOString(),
        titulo: valor.titulo,
        descricao: valor.descricao || null,
      }),
    });
    setAgendarObraId(null);
  }
```

- [ ] **Step 4: Ativar os botões 📅 e 🏷 no card**

Substituir os dois botões `disabled` de cada card. Trocar:

```typescript
                    <button
                      type="button"
                      title="Disponível no CRM"
                      disabled
                      className="cursor-not-allowed"
                    >
                      📅
                    </button>
```

por:

```typescript
                    <button type="button" title="Agendar" onClick={() => setAgendarObraId(obra.id)}>
                      📅
                    </button>
```

E trocar:

```typescript
                    <button
                      type="button"
                      title="Disponível no CRM"
                      disabled
                      className="cursor-not-allowed"
                    >
                      🏷
                    </button>
```

por:

```typescript
                    <button type="button" title="Acompanhar" onClick={() => abrirAcompanhar(obra.id)}>
                      🏷
                    </button>
```

- [ ] **Step 5: Adicionar o badge de status no card**

Logo após o bloco do cabeçalho do card (a `div` com o CNO e os quatro botões), antes da linha do
Proprietário, inserir:

```typescript
                {statusPorObra[obra.id] && (
                  <p className="mb-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {statusPorObra[obra.id].status.replaceAll("_", " ")}
                    </span>
                    {statusPorObra[obra.id].temperatura && (
                      <span className="ml-2 text-slate-500">
                        {statusPorObra[obra.id].temperatura!.replaceAll("_", " ")}
                      </span>
                    )}
                  </p>
                )}
```

- [ ] **Step 6: Renderizar os modais**

Junto do `<FiltrosAvancadosModal ... />` já existente, adicionar:

```typescript
      <AcompanhamentoModal
        aberto={acompanharObraId !== null}
        inicial={acompInicial}
        onSalvar={salvarAcompanhamento}
        onFechar={() => setAcompanharObraId(null)}
      />

      <AgendamentoModal
        aberto={agendarObraId !== null}
        onCriar={criarAgendamento}
        onFechar={() => setAgendarObraId(null)}
      />
```

- [ ] **Step 7: Type-check e suíte completa**

Run: `cd apps/web && npx tsc --noEmit && npx vitest run`
Expected: sem erros de tipo; todos os testes passam (existentes + Tasks 2-3).

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/leads-search-form.tsx
git commit -m "feat: activate agendar/acompanhar buttons with modals and status badge"
```

---

## Task 7: Verificação end-to-end

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte completa + build**

Run, em ordem:
1. `cd apps/web && npx vitest run` — todos passam.
2. `cd apps/web && npx tsc --noEmit` — limpo.
3. `cd apps/web && npx next build` — build verde (atenção: nenhum export não-handler em
   `route.ts`; a rota `acompanhar` exporta apenas `GET` e `POST`).

- [ ] **Step 2: e2e manual**

Com o dev server no ar e logado (reusar o fluxo de cadastro/login), em `/leads`:
1. Pesquisar UF=PR para listar obras.
2. Clicar 🏷 num card → o `AcompanhamentoModal` abre. Definir Status=CONTATO, Temperatura=QUENTE,
   Probabilidade=75, escrever uma anotação, Salvar. O card passa a mostrar o badge "CONTATO / QUENTE".
3. Clicar 🏷 no mesmo card de novo → o modal reabre **pré-populado** com os valores salvos.
4. Clicar 📅 no card → o `AgendamentoModal` abre. Preencher data, hora e título, Criar Agendamento.
   O modal fecha sem erro (a agenda em si aparece na Fase 3b).
5. Confirmar no log do server: `POST /api/leads/acompanhar 200`, `GET /api/leads/acompanhar 200`,
   `POST /api/leads/agendar 200`.

- [ ] **Step 3: Finalizar**

Use a skill `superpowers:finishing-a-development-branch` para verificar tudo e decidir merge/PR.

---
