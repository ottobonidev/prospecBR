import { BigQuery } from "@google-cloud/bigquery";
import type { ObraFonte, ObrasFonteClient } from "../services/obras-sync";

// Nomes de tabela/colunas são os melhores defaults conhecidos — confirmar
// contra o schema real do dataset em basedosdados.org antes de uso em produção.
// Assumimos que data_atualizacao é TIMESTAMP (o param `cursor` é passado como
// Date, que a lib mapeia para TIMESTAMP). Se a coluna real for DATE, a
// comparação precisa virar `data_atualizacao >= DATE(@cursor)` no SQL.
const TABELA_CNO =
  process.env.BASEDOSDADOS_CNO_TABLE ?? "basedosdados.br_rf_cno.microdados_obras";

const STATUS_VALIDOS: ObraFonte["status"][] = [
  "ATIVA",
  "ENCERRADA",
  "NULA",
  "SUSPENSA",
  "PARALISADA",
];

function normalizarStatus(valor: string): ObraFonte["status"] {
  const normalizado = valor.trim().toUpperCase();
  // 1) Match exato contra os valores canonicos.
  if ((STATUS_VALIDOS as string[]).includes(normalizado)) {
    return normalizado as ObraFonte["status"];
  }
  // 2) Match por familia/substring, para variantes como "07 - Encerrada".
  //    Ordem importa: familias mais especificas primeiro; "ATIVA" por ultimo,
  //    com guarda contra "INATIVA" (que contem "ATIVA" como substring).
  if (normalizado.includes("ENCERRA")) return "ENCERRADA";
  if (normalizado.includes("NULA")) return "NULA";
  if (normalizado.includes("SUSPEN")) return "SUSPENSA";
  if (normalizado.includes("PARALISA")) return "PARALISADA";
  if (normalizado.includes("ATIVA") && !normalizado.includes("INATIV")) {
    return "ATIVA";
  }
  // 3) Fallback diagnostico: loga o valor bruto para que a primeira execucao
  //    contra o dataset real revele status nao mapeados.
  console.warn(`[basedosdados-client] status desconhecido: ${JSON.stringify(valor)}`);
  return "ATIVA";
}

// BigQuery retorna colunas DATE/TIMESTAMP como instancias BigQueryDate /
// BigQueryTimestamp, que nao tem toString() customizado — String() nelas
// produz "[object Object]" e new Date() vira Invalid Date. Desembrulha a
// propriedade `.value` quando presente.
function paraDate(valor: unknown): Date {
  const bruto =
    typeof valor === "object" && valor !== null && "value" in valor
      ? String((valor as { value: unknown }).value)
      : String(valor);
  return new Date(bruto);
}

export class BaseDosDadosObrasClient implements ObrasFonteClient {
  private readonly bigquery: BigQuery;

  constructor(bigquery: BigQuery = new BigQuery()) {
    this.bigquery = bigquery;
  }

  async buscarAtualizadasDesde(cursor: Date): Promise<ObraFonte[]> {
    // `>=` (inclusivo) em vez de `>`: os dados do CNO costumam ter timestamps
    // com granularidade de dia, então milhares de linhas podem empatar em
    // data_atualizacao. Com `>` + LIMIT, linhas empatadas além do limite
    // seriam puladas para sempre. O `>=` re-busca as linhas de fronteira
    // (absorvidas por upserts idempotentes no chamador); a detecção de
    // livelock quando uma página inteira empata é responsabilidade do
    // chamador. O tiebreak por `cno` torna a ordenação determinística.
    const query = `
      SELECT
        cno,
        cnpj_responsavel AS cnpjResponsavel,
        razao_social AS razaoSocial,
        sigla_uf AS uf,
        nome_municipio AS cidade,
        bairro,
        cep,
        situacao AS status,
        data_inicio AS dataInicio,
        natureza,
        area_construida AS areaConstruida,
        data_atualizacao AS atualizadoEmFonte
      FROM \`${TABELA_CNO}\`
      WHERE data_atualizacao >= @cursor
      ORDER BY data_atualizacao ASC, cno ASC
      LIMIT 5000
    `;

    const [rows] = await this.bigquery.query({
      query,
      // Date -> param TIMESTAMP. Uma string ISO viraria param STRING, e o
      // BigQuery não coage STRING em comparações contra TIMESTAMP/DATE
      // ("No matching signature").
      params: { cursor },
    });

    return rows.map((row: Record<string, unknown>) => {
      const atualizadoEmFonte = paraDate(row.atualizadoEmFonte);
      if (Number.isNaN(atualizadoEmFonte.getTime())) {
        // Timestamp do cursor corrompido precisa falhar alto: um Invalid Date
        // silencioso congelaria o cursor de sincronização para sempre.
        throw new Error(
          `ATUALIZADO_EM_FONTE_INVALIDO: ${JSON.stringify(row.atualizadoEmFonte)}`,
        );
      }

      const dataInicio = row.dataInicio ? paraDate(row.dataInicio) : null;

      return {
        cno: String(row.cno),
        cnpjResponsavel: String(row.cnpjResponsavel),
        razaoSocial: String(row.razaoSocial),
        uf: String(row.uf),
        cidade: String(row.cidade),
        bairro: row.bairro ? String(row.bairro) : null,
        cep: row.cep ? String(row.cep) : null,
        status: normalizarStatus(String(row.status)),
        dataInicio:
          dataInicio && !Number.isNaN(dataInicio.getTime()) ? dataInicio : null,
        natureza: row.natureza ? String(row.natureza) : null,
        areaConstruida: row.areaConstruida ? Number(row.areaConstruida) : null,
        atualizadoEmFonte,
      };
    });
  }
}
