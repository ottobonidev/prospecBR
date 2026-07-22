import { describe, it, expect, vi } from "vitest";
import { sincronizarObras, type ObraFonte, type ObrasFonteClient } from "../obras-sync";

function obraFonte(overrides: Partial<ObraFonte> = {}): ObraFonte {
  return {
    cno: "111",
    cnpjResponsavel: "12345678000199",
    razaoSocial: "Obra Teste",
    uf: "PR",
    cidade: "Curitiba",
    bairro: null,
    cep: null,
    status: "ATIVA",
    dataInicio: null,
    natureza: null,
    areaConstruida: null,
    atualizadoEmFonte: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("sincronizarObras", () => {
  it("upserts each obra returned by the source, keyed by cno", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = { obra: { upsert } } as any;
    const fonte: ObrasFonteClient = {
      buscarAtualizadasDesde: vi.fn().mockResolvedValue([obraFonte()]),
    };

    const resultado = await sincronizarObras(prisma, fonte, new Date("2026-06-01T00:00:00.000Z"));

    expect(upsert).toHaveBeenCalledOnce();
    const args = upsert.mock.calls[0][0];
    expect(args.where).toEqual({ cno: "111" });
    expect(args.create.razaoSocial).toBe("Obra Teste");
    expect(args.update.razaoSocial).toBe("Obra Teste");
    expect(resultado.processadas).toBe(1);
  });

  it("advances the cursor to the latest atualizadoEmFonte seen", async () => {
    const prisma = { obra: { upsert: vi.fn().mockResolvedValue({}) } } as any;
    const fonte: ObrasFonteClient = {
      buscarAtualizadasDesde: vi.fn().mockResolvedValue([
        obraFonte({ cno: "1", atualizadoEmFonte: new Date("2026-07-01T00:00:00.000Z") }),
        obraFonte({ cno: "2", atualizadoEmFonte: new Date("2026-07-03T00:00:00.000Z") }),
      ]),
    };

    const resultado = await sincronizarObras(prisma, fonte, new Date("2026-06-01T00:00:00.000Z"));

    expect(resultado.novoCursor).toEqual(new Date("2026-07-03T00:00:00.000Z"));
    expect(resultado.processadas).toBe(2);
  });

  it("keeps the cursor unchanged when the source returns nothing", async () => {
    const prisma = { obra: { upsert: vi.fn() } } as any;
    const cursorAtual = new Date("2026-06-01T00:00:00.000Z");
    const fonte: ObrasFonteClient = { buscarAtualizadasDesde: vi.fn().mockResolvedValue([]) };

    const resultado = await sincronizarObras(prisma, fonte, cursorAtual);

    expect(resultado.novoCursor).toEqual(cursorAtual);
    expect(resultado.processadas).toBe(0);
    expect(prisma.obra.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent — running the same batch twice results in the same number of upsert calls each time", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = { obra: { upsert } } as any;
    const fonte: ObrasFonteClient = {
      buscarAtualizadasDesde: vi.fn().mockResolvedValue([obraFonte()]),
    };

    await sincronizarObras(prisma, fonte, new Date("2026-06-01T00:00:00.000Z"));
    await sincronizarObras(prisma, fonte, new Date("2026-06-01T00:00:00.000Z"));

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].where).toEqual(upsert.mock.calls[1][0].where);
  });
});
