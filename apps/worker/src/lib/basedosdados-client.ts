import { BigQuery } from "@google-cloud/bigquery";
import type { ObraFonte, ObrasFonteClient } from "../services/obras-sync";

// Nomes de tabela/colunas são os melhores defaults conhecidos — confirmar
// contra o schema real do dataset em basedosdados.org antes de uso em produção.
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
  return (STATUS_VALIDOS as string[]).includes(normalizado)
    ? (normalizado as ObraFonte["status"])
    : "ATIVA";
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
      params: { cursor: cursor.toISOString() },
    });

    return rows.map((row: Record<string, unknown>) => ({
      cno: String(row.cno),
      cnpjResponsavel: String(row.cnpjResponsavel),
      razaoSocial: String(row.razaoSocial),
      uf: String(row.uf),
      cidade: String(row.cidade),
      bairro: row.bairro ? String(row.bairro) : null,
      cep: row.cep ? String(row.cep) : null,
      status: normalizarStatus(String(row.status)),
      dataInicio: row.dataInicio ? new Date(String(row.dataInicio)) : null,
      natureza: row.natureza ? String(row.natureza) : null,
      areaConstruida: row.areaConstruida ? Number(row.areaConstruida) : null,
      atualizadoEmFonte: new Date(String(row.atualizadoEmFonte)),
    }));
  }
}
