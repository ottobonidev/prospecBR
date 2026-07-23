# Fase 3b — CRM: interface (abas Favoritos / Acompanhamentos / Agenda / Excluídos)

## Contexto

Segunda fatia da Fase 3 (CRM). A Fase 3a criou os dados do funil (`Acompanhamento`,
`Agendamento`) e a Fase 2.5 criou favoritar/ocultar (`ObraFavorito`, `ObraOculta`). Todos são
escritos a partir do card de Leads, mas ainda não há nenhuma tela que os liste. Esta fase entrega
a interface `/crm` que consolida esses quatro conjuntos numa visão por abas.

Base: `feature/fase1-fundacao` (já com Fases 2.5 e 3a mergeadas). CRM real documentado em
`docs/superpowers/specs/2026-07-22-conectaobras-sistema-real.md` §4.

## Escopo fechado com o usuário

- Cada aba mostra os dados **do usuário logado** (vendedor vê o seu; lojista vê o seu). O filtro
  por vendedor (visão do lojista da equipe inteira) fica para a Fase 3c, junto com os Indicadores.
- Quatro abas: **Favoritos, Acompanhamentos, Agenda, Excluídos**.

## O que entra

1. **Página `/crm`** (`apps/web/app/(app)/crm/page.tsx`, server component): resolve a sessão,
   busca as quatro listas do usuário via services e as passa para um client component de abas.
2. **`CrmTabs`** (`apps/web/components/crm-tabs.tsx`, client): navegação entre as quatro abas;
   na aba Acompanhamentos, chips para filtrar por status do funil (client-side, sobre a lista já
   carregada).
3. **`ObraCard`** (`apps/web/components/obra-card.tsx`): extraído do `leads-search-form.tsx`.
   Renderiza os campos da obra e recebe um `children` opcional como slot de contexto:
   - no Leads: os quatro botões de ação (agendar/favoritar/acompanhar/ocultar) + badge de status;
   - no CRM: um badge de contexto por aba (status+temperatura+probabilidade nos Acompanhamentos;
     data/hora + título na Agenda; nada em Favoritos/Excluídos).
4. **Quatro funções de listagem** (services), cada uma com `include: { obra: true }`:
   - `listarFavoritos(prisma, { usuarioId })` — em `obraFavoritos.ts`
   - `listarOcultas(prisma, { usuarioId })` — em `obraFavoritos.ts`
   - `listarAcompanhamentos(prisma, { usuarioId })` — em `obraAcompanhamento.ts`
   - `listarAgendamentos(prisma, { usuarioId })` — em `obraAgendamento.ts`
5. **Ativar o link CRM** na nav (`app-shell.tsx`): remover `disabled: true`.

## O que NÃO entra (YAGNI / fases posteriores)

- Relatórios e Indicadores por vendedor — Fase 3c.
- Filtro por vendedor / visão do lojista da equipe — Fase 3c.
- Seletor de CRM (Obras CNO / CAU / Empresas) — só existe CNO.
- Kanban com arrastar-e-soltar — a lista com filtro por status basta.
- Ações de edição a partir do CRM (editar acompanhamento/agendamento na própria tela) — o card
  de Leads já cobre a escrita; o CRM desta fase é leitura.
- Paginação nas abas — os volumes por usuário são pequenos nesta fase; se necessário, entra depois.

## Arquitetura e fluxo de dados

```
/crm (server component)
  ├─ getSessionContext()  → { userId }
  ├─ listarFavoritos(prisma, { usuarioId })       → ObraFavorito[] (com obra)
  ├─ listarOcultas(prisma, { usuarioId })         → ObraOculta[]  (com obra)
  ├─ listarAcompanhamentos(prisma, { usuarioId }) → Acompanhamento[] (com obra)
  ├─ listarAgendamentos(prisma, { usuarioId })    → Agendamento[] (com obra)
  └─ <CrmTabs favoritos acompanhamentos agendamentos ocultas />  (client)
        └─ aba ativa → lista de <ObraCard>, com badge de contexto por aba
```

Sem rotas GET novas: o server component busca direto (padrão de página server do projeto). O
filtro de status dos acompanhamentos é aplicado no client sobre a lista já carregada.

Serialização: a página passa para o client apenas o necessário. Campos `Date`
(`dataHora`, `criadoEm`) são convertidos para ISO string na fronteira server→client (o card já
formata strings ISO, como no Leads).

## Contratos de serviço

```
listarFavoritos(prisma, { usuarioId })       -> Array<ObraFavorito & { obra: Obra }>
listarOcultas(prisma, { usuarioId })         -> Array<ObraOculta & { obra: Obra }>
listarAcompanhamentos(prisma, { usuarioId }) -> Array<Acompanhamento & { obra: Obra }>
listarAgendamentos(prisma, { usuarioId })    -> Array<Agendamento & { obra: Obra }>
```

Todas filtram por `usuarioId`, incluem a obra relacionada e ordenam por data decrescente
(`criadoEm` para favoritos/ocultas/acompanhamentos; `dataHora` para agendamentos).

## Componente `ObraCard`

Extração do markup de card que hoje vive inline no `leads-search-form.tsx`. Props:

```
interface ObraCardProps {
  obra: ObraResumo;          // os campos já exibidos hoje no card de Leads
  children?: React.ReactNode; // slot de contexto (ações no Leads, badge no CRM)
}
```

`leads-search-form.tsx` passa os quatro botões + o badge de status como `children`; a tela de CRM
passa o badge apropriado de cada aba. O tipo `ObraResumo` é o `interface Obra` já existente no
`leads-search-form`, movido para junto do `ObraCard` e reexportado (para não duplicar).

## Erros e casos de borda

- Sessão inválida: a página redireciona para `/login` (mesmo comportamento das outras páginas do
  grupo `(app)`).
- Aba sem itens: renderiza uma mensagem "Nenhum item nesta aba".
- Acompanhamento cuja obra foi removida: protegido pela FK; não ocorre em uso normal.
- Filtro de status sem correspondência: lista vazia com a mensagem padrão.

## Testes

- **Services (vitest, mocks de prisma)**: cada `listar*` chama `findMany` com
  `where: { usuarioId }`, `include: { obra: true }` e o `orderBy` correto.
- **tsc** limpo; **`next build`** verde.
- **e2e**: logar → abrir `/crm` → ver as quatro abas; a aba Acompanhamentos lista o registro
  criado na 3a com o badge de status; filtrar por um status estreita a lista; a aba Agenda mostra
  o agendamento criado na 3a; Favoritos/Excluídos mostram itens quando existem.

## Impacto em código existente

- `leads-search-form.tsx`: passa a renderizar `<ObraCard>` em vez do markup inline; a lógica de
  busca/filtros/paginação/ações permanece. Redução de tamanho do arquivo (hoje grande).
- `app-shell.tsx`: link CRM deixa de ser `disabled`.
- `obraFavoritos.ts`, `obraAcompanhamento.ts`, `obraAgendamento.ts`: ganham uma função `listar*`
  cada, ao lado das existentes.
- Novos arquivos: `crm/page.tsx`, `crm-tabs.tsx`, `obra-card.tsx` + testes das listagens.
