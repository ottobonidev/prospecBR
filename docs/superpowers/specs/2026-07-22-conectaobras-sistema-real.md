# Conecta Obras — Mapa do Sistema Real (referência para clonagem)

Levantado navegando o sistema de produção (`conectaobras-76168.bubbleapps.io`) com a conta
ARPRIX DISTRIBUIDORA (perfil Lojista) em 22/07/2026. Este documento é a fonte da verdade sobre
**como o produto realmente funciona** — substitui as suposições feitas nas Fases 1 e 2.

---

## 1. Navegação global

Barra azul (`#2A4A9B`) fixa no topo, com logo à esquerda, versículo bíblico centralizado
(configurável pelo lojista), nome da conta + email do usuário à direita, e ícone de sair.

Módulos: **Dashboard · Leads · CRM · SDR IA · Consulta Plus · Busca Avançada · Conecta I.A. ·
Configurações 🔒 · Meu Painel**

Cada módulo tem uma **segunda barra de sub-abas** logo abaixo. Itens não liberados aparecem
cinza com selo vermelho "Em breve" e/ou cadeado.

---

## 2. Dashboard

Sub-abas: `Total Obras` · `Obras CNO` · `Obras CAU` · `Indicadores 🔒 Em breve` ·
`Ranking 🔒 Em breve` · `Empresas PJ 🔒 Em breve`

**Filtro de gráficos**: Estado (múltipla escolha) + Cidade, botões `Limpar Pesquisa` e
`Visualizar todos os gráficos`. Aviso apontando para a Busca Avançada.

**Cards de contagem (topo)**: Obras ATIVAS, Obras ENCERRADA, Obras Nulas, Obras PARALISADA,
Obras SUSPENSA. Cada card tem sigla colorida (OA verde, OE cinza, ON vermelho, OP amarelo,
OS laranja) + número formatado + tooltip (ⓘ).

**Coluna lateral direita**: Total de Obras, Obras Alvenaria, Obras Mista, Obras Madeira.

**Gráficos**: `Ranking de Obras por Estado` (barras verticais vermelhas por UF, ordenado desc)
e `Ranking de Obras por Cidade` (barras por município, ~50 cidades, labels rotacionados).
Abaixo: `Soma total da metragem das obras` e `Soma total da investimento das obras`.

Números reais observados (aba Obras CNO, base nacional): 3.519.518 obras totais,
1.012.068 ativas, 2.379.840 encerradas, 3.095.297 alvenaria, 185.833 mista, 44.287 madeira.

---

## 3. Leads

Sub-abas: `Obras CNO` · `Busca global CNO` · `Obras CAU` · `Busca global CAU` · `Empresas PJ` ·
`Obras públicas 🔒 Em breve` · `Profissionais PF 🔒 Em breve` · `Licitações 🔒 Em breve`

### 3.1 Obras CNO (núcleo do produto)

**Formulário de pesquisa** — Estado* (multi-select, só UFs com dados: PR, SP) e Cidade*
(autocomplete com todos os municípios da UF; obrigatório). Botões: `Pesquisar`,
`Exportar dados`, `Limpar Pesquisa`. Link `Busca Avançada` abre modal lateral de filtros.

**Barra de listagem** — `Obras por página` (10/25/50/100), `Ordem` (Recente/Antiga),
`Palavra Chave` (campo de busca livre com ícone de lupa).

**Modal Busca avançada** (todos opcionais; nota: "Caso opte por realizar uma busca apenas com
os filtros obrigatórios, o resultado trará todas as obras do estado e categoria selecionados"):

| Filtro | Valores |
|---|---|
| Categoria da obra | Obra da construção civil · Obra elétrica de infra |
| Subcategoria da obra | Obra Nova · Acréscimo · Reforma · Demolição · Existente |
| Tipo de obra | Alvenaria · Mista · Madeira |
| Situação da obra | Nula · Ativa · Suspensa · Paralisada · Encerrada |
| Tipo de área | Principal · Complementar |
| Data de início | intervalo de datas |
| Previsão de término | intervalo de datas |
| Metragem da obra | Até 100 · 100 a 250 · 250 a 500 · 500 a 750 · 750 a 1.000 · 1.000 a 3.000 · 3.000 a 20.000 · Acima de 20.000 |
| Zona | Rural · Urbana |
| Destinação da obra | Residencial unifamiliar · Residencial multifamiliar · Comercial salas e lojas · Edifício de Garagens · Galpão industrial · Casa popular · Conjunto habitacional popular |
| Tipo de Responsável | Pessoa Física · Pessoa Jurídica |

Botões `Limpar Filtros` e `Aplicar Filtros`.

**Card de obra** (este é o entregável central do produto):

```
900296655560 | PR - MARINGÁ                    [📅] [♡] [🏷] [🗑]
┌──────────────────────────────────────────────────────────────┐
│ ☐ Proprietário: NEIRIVALDO DOS SANTOS [🔍][📱][G]            │
│                          Responsável: NEIRIVALDO DOS SANTOS [G]│
└──────────────────────────────────────────────────────────────┘
Subcategoria: Obra Nova    Tipo: Alvenaria    Situação: Ativa
Tipo de área: Principal    Valor Investimento: R$644.497,99
Metragem: 285,92 m2   Área total: 285,92 m2
Destinação: Comercial salas e lojas
Data de início: 21/07/2026   Previsão de término: 17/04/2027
Endereço: AVENIDA, FRANKLIN DELANO ROOSEVELT - DT: 17 QD: 356,
          Nº 434, CONJUNTO HABITACIONAL REQUIAO I, MARINGÁ - PR  [maps][street]
Complemento: LOTE 311        (quando existe)
```

- **Cabeçalho**: número CNO + UF - CIDADE, e 4 ações: agendar (calendário), favoritar (coração),
  acompanhar/etiquetar (tag), excluir (lixeira).
- **Linha do proprietário** (fundo cinza-claro): checkbox de seleção, nome do proprietário com
  3 ícones de enriquecimento (consulta de dados, WhatsApp, busca no Google) e o responsável
  técnico com ícone de busca no Google. Proprietário e responsável podem ser diferentes
  (ex.: VISOLUX PAINEIS LTDA / PROSPERITA INVESTIMENTI LTDA).
- **Valor Investimento** é **derivado** (não vem do CNO): correlação observada de
  ~R$2.254/m² constante em todos os registros — é metragem × custo por m² (provavelmente CUB).
- **Previsão de término** também é derivada (data de início + prazo estimado por porte/tipo).
- **Ícones de mapa** no endereço: Google Maps e Street View.
- Ação em massa: `Selecionar todas as obras` no topo da lista.

**Paginação**: numérica (1…75 páginas com 10/pág) + rodapé `Total de Obras: 20226`
(Maringá-PR sozinha).

### 3.2 Busca global CNO
Campo único de busca livre (sem obrigatoriedade de UF/cidade) + itens por página. Serve para
localizar uma obra específica por CNO/nome em todo o país.

### 3.3 Obras CAU / Busca global CAU
Mesma estrutura de Obras CNO, mas o rótulo de paginação muda para `Atividades por página`
(são RRTs/atividades de arquitetos, não obras).

### 3.4 Empresas PJ
Estado* (27 UFs), Cidade*, e `Tipo(s)` — multi-select com a **lista completa de CNAEs**
(centenas de atividades econômicas, de "Abate de aves" a serviços especializados). Botões
`Limpar Pesquisa`, `Exportar dados`, `Pesquisar`.

---

## 4. CRM

Seleção inicial de qual CRM abrir: **CRM de Obras CNO**, **CRM de Obras CAU**, **CRM de Empresas**
("Gerencie suas obras e seus vendedores"). Botão vermelho `← Selecionar crm` permite voltar.

Sub-abas: `Relatórios` · `Agenda` · `Favoritos` · `Acompanhamentos` · `Excluídos` · `Indicadores`

### 4.1 Relatórios
Filtro: Usuários (vendedor), Data Inicial, Data Final + `Exportar dados`.
Cards: **Total · Excluídas · Agendamentos · Favoritos · Acompanhamentos**.
Gráficos: `Ranking por Probabilidade` e `Ranking por temperatura`, com uma coluna por vendedor
(scroll horizontal).

### 4.2 Favoritos
Filtro por vendedor + período. Lista os mesmos cards de obra, com coração preenchido e ícones
extras (Google, impressora). Exportação disponível.

### 4.3 Acompanhamentos (funil de vendas)
Filtros: **Status do Cliente**, Vendedor, Data Inicial/Final, Obras por página.

**Status do cliente (11 estágios do funil)**:
`Selecao` → `Contato` → `Nao respondeu` → `Respondeu` → `Orçamento` → `A fechar` → `fechado`
→ `Perdido` · `Ja comprou` · `Nao quer receber mensagem` · `Outros`

**Modal "Acompanhamento"** (aberto pelo ícone de etiqueta em qualquer obra):
- `Anotações` — texto livre
- `Status` — radio com os 11 estágios acima
- `Deseja definir uma temperatura?` — **Muito Quente · Quente · Morna · Fria**
- `Probabilidade` — **0% · 25% · 50% · 75% · 90%**
- Botão `Salvar`

**Modal "Agendamento"** (ícone de calendário):
- Nº da obra (link)
- Data + Hora
- Título do agendamento
- Descrição com **editor rich text** (fonte, negrito, itálico, sublinhado, tachado, cor,
  destaque, H1-H4, listas ordenada/não-ordenada, recuo, alinhamento, anexo)
- Botão `Criar Agendamento`

### 4.4 Indicadores
Tabela por usuário: **Nome · Grupo (Lojista/Vendedor) · Pesquisas realizadas · Agendamentos ·
Favoritos · Acompanhamentos · Excluídos**. Filtro por vendedor e período + exportação.

Equipe real observada: 1 Lojista + 10 vendedores.

---

## 5. SDR IA

Sub-abas: `Leads` · `Meus números` · `Configuração`

### 5.1 Leads (campanhas)
Alerta vermelho `Número desconectado` quando o WhatsApp cai. Botões `Cadastrar lead` e
`Nova campanha`.

Cards: **Campanhas ativas (17) · Leads em Follow-up (259) · Respostas (93)**

Tabela: `Nome da Campanha · Tipo · Tentativas · Intervalo · total de leads · Status ·
Data de criação · Ações` (editar ✏️, visualizar 👁, excluir 🗑).

**Tipos de campanha**: `Prospecção` e `Reativação`.

**Detalhe da campanha** (👁):
- Tentativas (ex. 3), Intervalo em horas (ex. 24), Tipos de abordagem
- **Instruções adicionais** — prompt em linguagem natural que guia o agente. Exemplo real:
  > "Quero que aborde o lead, apos uma resposta, levantar nessidade de compra de ar
  > condicionado e ventilacao, para sua obra, apos fazer uma breve apresentacao da Arcil,
  > verificar possibilidade de agendar uma visita tecnica para semana que vem, pois vamos
  > estar na regiao dele."
- Lista de leads: Nome · Telefone · Lista de origem · **Status** (`concluido`, `erro`,
  `respondido`)

### 5.2 Meus números
Listagem de números para disparo. Cada número: rótulo, número formatado, número cru,
status (`Desconectado`), botão `Reconectar`. Botão `Adicionar número`.
Modelo compatível com API não-oficial (Evolution/Baileys) — reconexão via QR.

### 5.3 Configuração (wizard 2 passos)
**Step 1 — Identidade do Agente**: Nome*, Objetivo primário*, Hora de início*, Hora fim*,
Site url, Número whatsapp* (formato `+55 (44) 9103-3330`).

**Step 2 — Informações da Empresa**: Nome da empresa*, Segmento*, Descrição*, `Adicionar link`,
Portfólio/catálogo (upload de arquivo), **Produtos/Serviços/Informações*** (texto longo que
funciona como base de conhecimento do agente — no exemplo real tem diferenciais, linha de
produtos, serviços, endereços das unidades).

---

## 6. Consulta Plus
Campo único: `Digite o CPF ou CNPJ` + `Pesquisar` + `Exportar dados`. Badge fixo no canto
superior direito: **Consultas / 9** (saldo restante). Consome crédito por consulta.

## 7. Busca Avançada (`/registro-imovel`)
Busca de **registro de imóvel / proprietários**: campo `Nome` + `Pesquisar` + botão vermelho
`Filtros avançados`. Mostra `Total de Dados:` e o mesmo badge de Consultas.

## 8. Conecta I.A.
Chat com histórico na lateral esquerda (`+ Novo chat`, lista de conversas) e área central
"Crie ou selecione um chat" com ilustração.

## 9. Meu Painel
Sub-aba `Lojista`. Card **Vendedores cadastrados** com:
- Cota: `Consultas plus por mês: 600`, `Consultas plus distribuídas para vendedores: 590`,
  `Quantidades consultas consumidas: 1`
- Botão `+ Cadastrar`, busca, `Exibindo N registros por página`
- Tabela: `Nome · Email - Acesso · Status · Ações`, com paginação

## 10. Configurações 🔒
Bloqueado para o perfil Lojista (cadeado) — provavelmente área do administrador da plataforma.

---

## 11. Distância entre o sistema real e o que foi construído (Fases 1-2)

| Dimensão | Sistema real | Nosso clone hoje | Ação |
|---|---|---|---|
| Card de obra | 14 campos + 4 ações + enriquecimento + mapas | 4 campos, sem ações | **Refazer** |
| Filtros de busca | 11 filtros avançados + UF/cidade obrigatórios | UF/cidade/palavra-chave | **Ampliar** |
| Valor de investimento | Derivado (~R$2.254/m²) | Inexistente | **Criar** |
| Previsão de término | Derivada da data de início | Inexistente | **Criar** |
| Seleção de cidade | Autocomplete IBGE por UF | Texto livre | **Trocar** |
| Paginação | Numérica + total geral | Página única | **Criar** |
| CRM | 3 CRMs, 6 abas, funil de 11 estágios, temperatura, probabilidade, agenda rich-text | Não existe | **Fase 3** |
| SDR IA | Campanhas multi-tentativa, agente configurável, multi-número | Não existe | **Fase 4** |
| Consulta Plus / Busca Avançada | Consulta CPF/CNPJ e imóvel com saldo | Não existe | **Fase 5** |
| Conecta I.A. | Chat com histórico | Não existe | **Fase 6** |
| Meu Painel | Cota de consultas distribuída por vendedor, tabela com ações | Lista simples + alocação | **Ajustar** |
| Empresas PJ | Busca por CNAE (lista completa) | Não existe | **Fase 5** |

### O que já está certo e deve ser mantido
- Multi-tenant lojista/vendedor com convite (Fase 1) — bate com o modelo real (1 lojista + N vendedores).
- Motor de créditos com cota mensal, ledger e excedente pós-pago — o real usa exatamente esse
  conceito ("Consultas plus por mês: 600 / distribuídas: 590 / consumidas: 1").
- Ingestão de CNO por worker + cursor — necessário para as 3,5 milhões de obras.

### Melhorias possíveis sobre o original
- **Kanban de verdade** no CRM (o real é tabela com filtro de status; kanban arrastável é
  um ganho claro de usabilidade sobre o funil de 11 estágios).
- **API oficial do WhatsApp** (Cloud API) como alternativa ao número não-oficial que hoje
  aparece "Desconectado" — mantendo Evolution como fallback.
- Cidade/UF via **API IBGE** em vez de lista fixa.
- Deduplicação de obras: o real exibe registros claramente duplicados (mesmo proprietário,
  mesmo endereço, mesma metragem — ex. COCAMAR e MARCELO BISPO aparecem duas vezes).
