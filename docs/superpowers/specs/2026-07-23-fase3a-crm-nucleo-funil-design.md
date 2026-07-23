# Fase 3a — CRM: núcleo do funil (acompanhar + agendar)

## Contexto

O CRM real (documentado em `docs/superpowers/specs/2026-07-22-conectaobras-sistema-real.md`,
seção 4) é grande: 3 CRMs (Obras CNO, Obras CAU, Empresas), 6 abas (Relatórios, Agenda,
Favoritos, Acompanhamentos, Excluídos, Indicadores), funil de 11 estágios, temperatura,
probabilidade e agenda com editor rich-text. É grande demais para um único ciclo, então a
Fase 3 foi decomposta:

- **Fase 3a (esta) — núcleo do funil**: modelos e ações de `acompanhar` e `agendar`, ativadas
  direto no card de Leads. Destrava os dois botões que a Fase 2.5 deixou desabilitados com
  tooltip "Disponível no CRM" (📅 agendar, 🏷 acompanhar/etiquetar).
- **Fase 3b — interface CRM**: seletor de CRM + abas (Favoritos, Acompanhamentos com visão de
  funil, Agenda, Excluídos) com filtros por vendedor/status.
- **Fase 3c — Relatórios/Indicadores**: métricas e rankings por vendedor.

A Fase 2.5 (design em `2026-07-22-fase2.5-leads-paridade-design.md`) já entregou favoritar e
ocultar per-user e sinalizou agendar/acompanhar como "Disponível no CRM". Esta fase escreve os
dados do funil que a interface CRM (3b) vai ler.

## Escopo fechado com o usuário

Só a Fase 3a — núcleo do funil. A interface CRM completa (abas, seletor), Relatórios/Indicadores,
CRM de CAU/Empresas, editor rich-text e anexo de agendamento ficam para depois.

## O que entra

1. **Dois modelos novos** no schema (`packages/db`):
   - `Acompanhamento` — o registro do funil de um vendedor sobre uma obra. Único por
     `(usuarioId, obraId)` — salvar é um upsert, refletindo o modal real que edita um único
     acompanhamento por obra.
   - `Agendamento` — um compromisso datado de um vendedor sobre uma obra. Vários por obra.

2. **Dois enums novos**:
   - `StatusAcompanhamento` — os 11 estágios do funil real, na ordem observada:
     `SELECAO`, `CONTATO`, `NAO_RESPONDEU`, `RESPONDEU`, `ORCAMENTO`, `A_FECHAR`, `FECHADO`,
     `PERDIDO`, `JA_COMPROU`, `NAO_QUER_RECEBER_MENSAGEM`, `OUTROS`.
   - `TemperaturaLead` — `MUITO_QUENTE`, `QUENTE`, `MORNA`, `FRIA`.
   - Probabilidade é um `Int` opcional validado ∈ {0, 25, 50, 75, 90} na borda (Zod/service),
     não um enum — mais simples de exibir e de evoluir se o produto mudar os degraus.

3. **Dois serviços** (TDD, espelhando `obraFavoritos.ts` da Fase 2.5):
   - `obraAcompanhamento.ts`:
     - `salvarAcompanhamento(prisma, input)` — upsert por `(usuarioId, obraId)`.
     - `buscarAcompanhamento(prisma, { usuarioId, obraId })` — retorna o registro existente (ou
       null) para pré-popular o modal.
   - `obraAgendamento.ts`:
     - `criarAgendamento(prisma, input)` — create.

4. **Três rotas** (mesmo padrão das rotas favoritar/ocultar: `getSessionContext`, validação Zod,
   try/catch com mapeamento de erro, `ctx.contaId` + `ctx.userId`):
   - `POST /api/leads/acompanhar` — salva/atualiza o acompanhamento.
   - `GET  /api/leads/acompanhar?obraId=` — lê o acompanhamento atual do vendedor para a obra.
   - `POST /api/leads/agendar` — cria um agendamento.

5. **Dois modais** na UI de Leads (drawer lateral, igual ao `FiltrosAvancadosModal`):
   - `AcompanhamentoModal` — anotações (textarea), status (11 opções, seleção única),
     temperatura (4 opções, opcional), probabilidade (5 opções, opcional), botão Salvar.
   - `AgendamentoModal` — data, hora, título, descrição (textarea), botão Criar Agendamento.

6. **Ativação no card** (`leads-search-form.tsx`): os botões 📅 e 🏷 deixam de ser `disabled`
   e passam a abrir os respectivos modais para a obra clicada. Ao abrir 🏷, a UI faz o GET para
   pré-popular o modal. Após salvar um acompanhamento, o card mostra um badge com o status
   (cor derivada da temperatura, quando definida).

## O que NÃO entra (YAGNI / fases posteriores)

- Abas do CRM, seletor de CRM, visão de funil/kanban — Fase 3b.
- Relatórios e Indicadores por vendedor — Fase 3c.
- CRM de Obras CAU e de Empresas — dependem de dados que só chegam na Fase 5.
- Editor rich-text e anexo no agendamento — começa com textarea simples; rich-text depois.
- Notificações/lembrete de agendamento.

## Modelo de dados (detalhe)

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

Back-relations em `Conta`, `Usuario` e `Obra` (`acompanhamentos`, `agendamentos`).

`contaId` fica nos dois modelos (diferente de `ObraFavorito`, que é puramente pessoal): o CRM da
Fase 3b lista o funil e a agenda **da loja inteira**, filtrando por vendedor — então a conta é
uma dimensão de consulta de primeira classe, não derivável barata via join a cada query.

## Contratos de serviço

```
salvarAcompanhamento(prisma, {
  usuarioId, contaId, obraId,
  status,                      // StatusAcompanhamento
  temperatura?, probabilidade?, anotacoes?
}) -> Acompanhamento           // upsert por (usuarioId, obraId)

buscarAcompanhamento(prisma, { usuarioId, obraId }) -> Acompanhamento | null

criarAgendamento(prisma, {
  usuarioId, contaId, obraId,
  dataHora,                    // Date
  titulo, descricao?
}) -> Agendamento
```

Validação na borda (rota, Zod): `status` via `nativeEnum(StatusAcompanhamento)`; `temperatura`
via `nativeEnum(TemperaturaLead)`; `probabilidade` inteiro em `{0,25,50,75,90}`; `obraId`/`titulo`
não-vazios; `dataHora` coercível para Date. Erros → 400 `DADOS_INVALIDOS`; sem sessão → 401.

## Fluxo de dados

1. Vendedor clica 🏷 num card → UI faz `GET /api/leads/acompanhar?obraId=X` → pré-popula o modal
   com o acompanhamento atual (se houver).
2. Vendedor edita e Salva → `POST /api/leads/acompanhar` → `salvarAcompanhamento` (upsert) →
   card recebe o novo status/temperatura e mostra o badge.
3. Vendedor clica 📅 → `AgendamentoModal` → Criar → `POST /api/leads/agendar` →
   `criarAgendamento` (create). Sem mudança visível no card nesta fase (a agenda aparece na 3b);
   confirmação simples de sucesso.

## Erros e casos de borda

- Obra inexistente / não visível: a rota confia no `obraId` vindo do card já carregado; FK do
  Prisma protege contra id inválido (erro → 500 `ERRO_INTERNO`, sem vazar detalhe).
- `probabilidade` fora do conjunto → 400.
- Salvar acompanhamento duas vezes: o upsert atualiza, nunca duplica (garantido pelo unique).
- Agendamento no passado: permitido nesta fase (sem regra de negócio de data ainda).

## Testes

- **Serviços (vitest, mocks de prisma como em `obraFavoritos.test.ts`)**: upsert cria vs atualiza;
  `buscarAcompanhamento` retorna null quando não existe; `criarAgendamento` chama `create` com o
  payload certo.
- **tsc** limpo; **`next build`** verde (atenção à regra de rotas: nada de export não-handler em
  `route.ts`, lição da Fase 2.5).
- **e2e**: abrir 🏷 → salvar status+temperatura → badge aparece no card; reabrir → modal
  pré-populado; abrir 📅 → criar agendamento → confirmação.

## Impacto em código existente

- `leads-search-form.tsx`: os botões 📅/🏷 saem de `disabled`; adiciona estado de modal
  aberto/obra-alvo e o badge de status no card. O restante do componente (busca, filtros,
  paginação, favoritar/ocultar) fica intacto.
- Novos arquivos: 2 services + 2 testes, 3 rotas, 2 modais.
