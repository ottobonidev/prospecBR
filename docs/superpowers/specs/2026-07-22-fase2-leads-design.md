# Fase 2 — Módulo Leads (busca de obras CNO) + Motor de Créditos

## Contexto

Fase 1 entregou fundação multi-tenant (auth, signup lojista, convite/aceite vendedor). Fase 2 entrega o
primeiro módulo de valor real do produto: busca de obras em construção (Leads), inspirado no produto de
referência (conectaobras-76168.bubbleapps.io). Esse módulo introduz também o motor de créditos, que será
reaproveitado pelas fases seguintes (Consulta Plus, SDR IA).

Decisões já fechadas com o usuário:
- Fonte de dados de obras: **Base dos Dados** (basedosdados.org), que replica o CNO (Cadastro Nacional de
  Obras) oficial da Receita Federal via BigQuery — gratuita dentro da cota sandbox, sem scraping.
  O portal oficial da Receita não serve pois só permite consulta pelo próprio responsável da obra (sem bulk).
- CAU (dados de arquitetos/RRT) fica fora desta fase — não existe API pública estável, só portal manual.
- Modelo de cobrança: cada tenant (loja) tem cota mensal grátis de buscas. Acima da cota, toda busca extra
  é cobrada do cliente com markup (ex.: custo de API 0,20 → cobrança 0,40). Cobrança é por **fatura mensal**
  no fechamento do mês — nunca bloqueia a busca em tempo real, não há gateway de pagamento nesta fase.
- A cota grátis pertence à loja (tenant) e é distribuída entre vendedores pelo lojista, no mesmo espírito do
  "Meu Painel" do produto de referência (cota total / distribuída / consumida). Essa alocação por vendedor é
  **informativa** nesta fase — não bloqueia buscas do vendedor além do alocado, só ajuda o lojista a planejar.
  O motor de créditos é compartilhado entre módulos futuros (Consulta Plus, SDR IA), cada tipo de busca com
  seu próprio custo/preço configurável.

## Arquitetura

- `packages/db`: novo schema Drizzle para `obras` (dado de referência global, não pertence a nenhum tenant)
  e para o motor de créditos (`credit_plan`, `credit_allocation`, `credit_ledger`, `billing_invoice`),
  tenant-scoped.
- `apps/worker`: novo job BullMQ `obras:sync`, agendado (cron diário), que consulta o Base dos Dados via
  cliente BigQuery e faz upsert incremental em `obras`.
- `apps/web`: nova rota `/leads` (UI de busca) e route handler `/api/leads/search`.

## Dados de obras (`obras`)

Campos principais: identificador CNO, CNPJ do responsável, razão social, UF, cidade, bairro, CEP, status
(ativa / encerrada / nula / suspensa / paralisada), data de início, natureza da obra, área construída.

Índices: `(uf, cidade, status)` composto, para as buscas mais comuns do filtro.

Ingestão: job incremental — mantém um cursor (data da última sincronização bem-sucedida) e só busca linhas
novas/atualizadas desde então. Uma primeira carga histórica completa roda uma vez (pode ser um script manual
separado do job recorrente, dado o volume nacional).

## Motor de créditos

- `credit_plan` (por tenant): cota mensal grátis de buscas, preço de custo e preço de venda por tipo de
  busca (ex. `leads_search`, e no futuro `consulta_cpf`, `consulta_cnpj`), markup configurável.
- `credit_allocation` (por tenant + vendedor): quanto da cota mensal o lojista decidiu alocar para cada
  vendedor. Somente informativo — usado para exibir no painel, não para bloquear.
- `credit_ledger`: uma linha por busca realizada — tenant, vendedor, tipo de busca, timestamp, se consumiu
  cota grátis ou virou excedente.
- `billing_invoice`: gerado no fechamento do mês (job agendado), soma o excedente do tenant no período,
  status `pendente` / `paga` (marcação manual por um admin nesta fase — sem gateway de pagamento).

Regra de negócio central: **nunca bloqueia busca**. Enquanto o total consumido pelo tenant no mês não
ultrapassar a cota grátis, a busca é grátis; a partir daí, toda busca extra vira linha de excedente na
fatura do mês. A dedução/registro de cota é feita em transação atômica (ledger insert + leitura do total do
mês na mesma transação) para não haver corrida entre buscas concorrentes.

## Busca (UI + API)

- Filtros: UF (múltipla escolha), cidade, status da obra, palavra-chave; paginação e ordenação (mais
  recente / relevância).
- Resultado: lista de obras com badge de status, exportação CSV do resultado atual da página.
- Contador visível "buscas grátis restantes este mês" (cota do tenant, não do vendedor individual).
- `/api/leads/search`: valida filtros, executa a query em `obras`, registra o consumo no `credit_ledger`
  dentro da mesma transação da resposta, devolve resultado + total encontrado.

## Erros

- Job de ingestão: falha em uma página/lote não derruba o job inteiro — log estruturado, retry automático
  via BullMQ (backoff exponencial), cursor só avança em lotes confirmados.
- Falha ao contatar Base dos Dados (BigQuery indisponível, cota estourada): job marca tentativa como falha e
  tenta de novo no próximo agendamento; não impacta a busca do usuário (que lê da nossa cópia local em
  Postgres, não direto do BigQuery).
- Dedução de crédito: se a transação falhar, a busca inteira falha (não retorna resultado sem registrar
  consumo) — consistência entre resultado entregue e cobrança é mais importante que disponibilidade nesse
  caso raro.

## Testes

- Ingestão: upsert idempotente (rodar o mesmo lote duas vezes não duplica nem quebra), cursor avança
  corretamente.
- Créditos: busca dentro da cota (grátis), busca exatamente no limite, busca após estourar (vira
  excedente), fechamento de mês gera fatura com valor correto (soma de excedentes × preço de venda).
- Busca: filtros combinados (UF+cidade+status+palavra-chave) retornam o subconjunto esperado; paginação
  correta.

## Fora de escopo nesta fase

- Gateway de pagamento / cobrança automática de excedente.
- Enforcement de alocação por vendedor (é só informativo).
- CAU, Empresas PJ, Licitações (módulos futuros do Leads).
- Export CSV completo de todos os resultados (só a página atual, nesta fase).
