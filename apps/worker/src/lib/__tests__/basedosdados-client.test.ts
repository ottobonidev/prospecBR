import { describe, expect, it, vi } from "vitest";
import type { BigQuery } from "@google-cloud/bigquery";
import { BaseDosDadosObrasClient } from "../basedosdados-client";

function criarMockBigQuery(rows: Record<string, unknown>[]) {
  return {
    query: vi.fn().mockResolvedValue([rows]),
  } as unknown as BigQuery;
}

const linhaCompleta = {
  cno: "123456789",
  cnpjResponsavel: "11222333000181",
  razaoSocial: "Construtora Exemplo LTDA",
  uf: "SP",
  cidade: "Sao Paulo",
  bairro: "Centro",
  cep: "01001000",
  status: "encerrada",
  dataInicio: "2024-01-15",
  natureza: "Edificacao",
  areaConstruida: "1234.5",
  atualizadoEmFonte: "2025-06-01T00:00:00.000Z",
};

describe("BaseDosDadosObrasClient", () => {
  it("mapeia uma linha completa para ObraFonte, normalizando status", async () => {
    const bigquery = criarMockBigQuery([
      linhaCompleta,
      { ...linhaCompleta, cno: "987", status: "desconhecido" },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const obras = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obras).toHaveLength(2);
    expect(obras[0]).toEqual({
      cno: "123456789",
      cnpjResponsavel: "11222333000181",
      razaoSocial: "Construtora Exemplo LTDA",
      uf: "SP",
      cidade: "Sao Paulo",
      bairro: "Centro",
      cep: "01001000",
      status: "ENCERRADA",
      dataInicio: new Date("2024-01-15"),
      natureza: "Edificacao",
      areaConstruida: 1234.5,
      atualizadoEmFonte: new Date("2025-06-01T00:00:00.000Z"),
    });
    // Valor desconhecido cai no default ATIVA
    expect(obras[1].status).toBe("ATIVA");
  });

  it("mapeia campos ausentes para null", async () => {
    const bigquery = criarMockBigQuery([
      {
        cno: "555",
        cnpjResponsavel: "11222333000181",
        razaoSocial: "Obra Minima",
        uf: "RJ",
        cidade: "Rio de Janeiro",
        bairro: null,
        cep: null,
        status: "ATIVA",
        dataInicio: null,
        natureza: null,
        areaConstruida: null,
        atualizadoEmFonte: "2025-06-02T00:00:00.000Z",
      },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const [obra] = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obra.bairro).toBeNull();
    expect(obra.cep).toBeNull();
    expect(obra.dataInicio).toBeNull();
    expect(obra.natureza).toBeNull();
    expect(obra.areaConstruida).toBeNull();
  });

  it("gera SQL com cursor inclusivo, ordenacao deterministica e limite", async () => {
    const bigquery = criarMockBigQuery([]);
    const client = new BaseDosDadosObrasClient(bigquery);
    const cursor = new Date("2025-05-01T00:00:00.000Z");

    await client.buscarAtualizadasDesde(cursor);

    const mockQuery = (bigquery as unknown as { query: ReturnType<typeof vi.fn> })
      .query;
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [{ query, params }] = mockQuery.mock.calls[0];
    expect(query).toContain("data_atualizacao >= @cursor");
    expect(query).toContain("ORDER BY data_atualizacao ASC, cno ASC");
    expect(query).toContain("LIMIT 5000");
    expect(params).toEqual({ cursor: cursor.toISOString() });
  });
});
