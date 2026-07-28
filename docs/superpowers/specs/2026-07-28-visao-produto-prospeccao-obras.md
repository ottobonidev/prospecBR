# Visao de Produto — Plataforma de prospeccao para obras

## Contexto

O projeto nasceu como uma referencia ao Conecta Obras, mas o produto final nao deve ser tratado
como clone literal nem carregar esse nome. A direcao atual e construir uma plataforma propria de
prospeccao B2B para construcao civil, combinando busca de obras/empresas, enriquecimento de
contatos, CRM comercial e automacao de abordagem por vendedor.

Nomes de trabalho possiveis:

- Prospect Obras
- Fluxo Obras
- outro nome definitivo ainda a escolher

Enquanto o posicionamento e marca nao estiverem fechados, o codigo pode continuar usando nomes
internos como `conecta-obras` apenas como identificador tecnico temporario.

## Proposta central

A plataforma ajuda empresas fornecedoras da construcao civil a encontrar oportunidades, descobrir
contatos dos decisores e executar abordagens comerciais em escala, com controle de consumo por
conta e por vendedor.

Fluxo principal esperado:

1. O usuario pesquisa obras, empresas ou oportunidades por regiao/filtros.
2. O sistema mostra cards de leads com dados publicos da obra/empresa.
3. O usuario revela/enriquece contatos a partir de CNPJ ou dados do responsavel.
4. Cada enriquecimento consome credito e registra custo/cobranca.
5. O usuario organiza os leads no CRM: favoritos, acompanhamentos, agenda e excluidos.
6. Vendedores disparam campanhas/abordagens via robos configurados pela propria conta.
7. O sistema mede consumo, excedentes, atividade comercial e performance dos vendedores.

## Modulos do produto

### Leads e obras

Busca de obras CNO/CAU, empresas PJ e outras bases futuras. Este modulo e a origem dos leads e
deve continuar priorizando filtros bons, card rico e acoes rapidas.

### Enriquecimento de contatos

Busca contatos particulares/comerciais relacionados a um CNPJ, como telefones de socios,
responsaveis e possiveis decisores.

Ainda precisamos descobrir/validar o fornecedor ideal. Possibilidades a avaliar:

- Serasa Experian
- BigDataCorp
- Assertiva
- Econodata ou provedores semelhantes
- combinacao Receita Federal/CNPJ publicos + fornecedor pago de telefone

Decisao tecnica: implementar uma camada propria de provider, por exemplo
`ContactEnrichmentProvider`, para trocar fornecedor sem reescrever o produto.

### Creditos, custos e excedentes

Cada consulta paga precisa gerar um registro auditavel com:

- conta e usuario que fez a consulta
- tipo de consulta: CNPJ, CPF, telefone, socio, imovel, etc.
- fornecedor usado
- chave consultada, como CNPJ
- custo real do fornecedor
- preco cobrado do cliente
- se entrou na franquia mensal ou no excedente
- data/hora e status da consulta

A mensalidade deve incluir uma franquia de consultas. O que passar da franquia vira excedente e
entra na cobranca junto da mensalidade do sistema.

### CRM

O CRM e o centro operacional dos leads trabalhados: favoritos, acompanhamentos, agenda, excluidos,
indicadores e, depois, visao por equipe/vendedor.

A Fase 3b continua valida como proxima entrega porque consolida os dados que ja sao escritos pelos
cards de Leads.

### Robos de disparo e SDR IA

Cada vendedor/login podera ter robos de disparo, com configuracao feita pela propria conta dentro
do sistema.

Devem existir dois caminhos tecnicos separados:

- API oficial do WhatsApp/Meta: mais estavel, com templates, webhooks e regras de aprovacao.
- API nao oficial: mais simples para alguns usos, mas com risco de desconexao, bloqueio de numero
  e mudancas frequentes.

O produto deve deixar claro internamente qual canal cada numero usa, quais limites se aplicam e
quais eventos precisam ser registrados: enviado, entregue, respondido, erro, bloqueado,
desconectado.

### Configuracao do agente

O cliente configura o estilo do agente pelo sistema:

- nome do agente
- objetivo principal
- horario permitido de atendimento/disparo
- tom de voz
- descricao da empresa
- produtos/servicos
- links, catalogos e anexos
- instrucoes adicionais por campanha

Essas configuracoes alimentam os prompts e regras dos robos de abordagem.

## Decisoes de arquitetura

- Separar busca de obras de enriquecimento pago. Ver uma obra nao e a mesma coisa que revelar
  contatos.
- Usar ledger de creditos para tudo que tenha custo ou possa gerar excedente.
- Isolar fornecedores pagos por interfaces internas, evitando acoplamento a uma API especifica.
- Separar WhatsApp oficial e nao oficial em modelos/configuracoes diferentes.
- Manter CRM como camada comum para leads vindos de obras, empresas PJ e futuras bases.
- Nao amarrar a marca definitiva ao schema ou APIs publicas enquanto o nome nao estiver decidido.

## Roadmap ajustado

| Fase | Entrega | Status |
|---|---|---|
| 1 | Fundacao SaaS: contas, usuarios, vendedores, creditos base | implementado |
| 2 | Leads e motor de creditos para busca de obras | implementado |
| 2.5 | Paridade do card/filtros de Leads com o sistema de referencia | implementado |
| 3a | Nucleo do funil: acompanhar e agendar no card | implementado |
| 3b | Interface `/crm` com abas Favoritos, Acompanhamentos, Agenda e Excluidos | proximo |
| 3c | Relatorios, indicadores e visao por vendedor/equipe | depois |
| 4 | SDR IA e robos de disparo por vendedor | depois |
| 5 | Consulta Plus/enriquecimento por CNPJ/CPF e ledger de excedentes | depois |
| 6 | Empresas PJ, busca avancada e bases adicionais | depois |
| 7 | Conecta/Fluxo IA: chat com historico e apoio comercial | depois |

## Perguntas abertas

- Qual sera o fornecedor de contatos por CNPJ?
- A consulta sera sempre por CNPJ ou tambem por CPF/nome/endereco?
- Qual franquia mensal entra em cada plano?
- O excedente sera cobrado por custo fixo por consulta ou margem por tipo de fornecedor?
- A API nao oficial de WhatsApp sera oferecida como produto principal, fallback ou opcao por risco
  assumido pelo cliente?
- O nome definitivo sera Prospect Obras, Fluxo Obras ou outra marca?
