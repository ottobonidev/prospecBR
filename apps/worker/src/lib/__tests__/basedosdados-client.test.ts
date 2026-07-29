import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    // Date direto -> param TIMESTAMP (string ISO viraria param STRING e
    // quebraria a comparacao contra coluna TIMESTAMP).
    expect(params).toEqual({ cursor });
    expect(params.cursor).toBeInstanceOf(Date);
  });

  it("desembrulha objetos de data do BigQuery ({ value }) em Dates validos", async () => {
    const bigquery = criarMockBigQuery([
      {
        ...linhaCompleta,
        dataInicio: { value: "2024-01-15" },
        atualizadoEmFonte: { value: "2026-07-01T00:00:00.000Z" },
      },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const [obra] = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obra.dataInicio).toEqual(new Date("2024-01-15"));
    expect(obra.atualizadoEmFonte).toEqual(new Date("2026-07-01T00:00:00.000Z"));
  });

  it("rejeita quando atualizadoEmFonte nao pode ser parseado", async () => {
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, atualizadoEmFonte: { foo: "bar" } },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    await expect(
      client.buscarAtualizadasDesde(new Date("2025-05-01")),
    ).rejects.toThrow(/ATUALIZADO_EM_FONTE_INVALIDO/);
  });

  it("rejeita quando atualizadoEmFonte e uma string lixo", async () => {
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, atualizadoEmFonte: "nao-e-data" },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    await expect(
      client.buscarAtualizadasDesde(new Date("2025-05-01")),
    ).rejects.toThrow(/ATUALIZADO_EM_FONTE_INVALIDO/);
  });

  it("mapeia dataInicio invalido para null (campo nao critico)", async () => {
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, dataInicio: { foo: "bar" } },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const [obra] = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obra.dataInicio).toBeNull();
  });

  it("normaliza variantes de status por familia/substring", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, cno: "1", status: "07 - Encerrada" },
      { ...linhaCompleta, cno: "2", status: "Obra Suspensa" },
      { ...linhaCompleta, cno: "3", status: "02 - Paralisada" },
      { ...linhaCompleta, cno: "4", status: "Inscricao Nula" },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const obras = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obras.map((o) => o.status)).toEqual([
      "ENCERRADA",
      "SUSPENSA",
      "PARALISADA",
      "NULA",
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("INATIVA nao vira ATIVA via familia — cai no fallback com warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, status: "INATIVA" },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const [obra] = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    // Nao e um dos cinco valores canonicos: fica no fallback ATIVA, mas com
    // warn diagnostico contendo o valor bruto.
    expect(obra.status).toBe("ATIVA");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("status desconhecido"),
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("INATIVA"));
  });

  it("status totalmente desconhecido gera warn e cai em ATIVA", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bigquery = criarMockBigQuery([
      { ...linhaCompleta, status: "desconhecido" },
    ]);
    const client = new BaseDosDadosObrasClient(bigquery);

    const [obra] = await client.buscarAtualizadasDesde(new Date("2025-05-01"));

    expect(obra.status).toBe("ATIVA");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("desconhecido"),
    );
  });
});
