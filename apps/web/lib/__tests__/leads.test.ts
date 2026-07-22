import { describe, it, expect, vi } from "vitest";
import { buscarObras } from "../services/leads";

function mockPrisma(items: any[], total: number) {
  return {
    obra: {
      findMany: vi.fn().mockResolvedValue(items),
      count: vi.fn().mockResolvedValue(total),
    },
  } as any;
}

describe("buscarObras", () => {
  it("filters by uf, cidade, status and palavraChave, with pagination defaults", async () => {
    const prisma = mockPrisma([{ id: "obra_1" }], 1);

    const resultado = await buscarObras(prisma, {
      uf: ["PR", "SC"],
      cidade: "Curitiba",
      status: ["ATIVA"],
      palavraChave: "residencial",
    });

    expect(prisma.obra.findMany).toHaveBeenCalledOnce();
    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.uf).toEqual({ in: ["PR", "SC"] });
    expect(args.where.cidade).toBe("Curitiba");
    expect(args.where.status).toEqual({ in: ["ATIVA"] });
    expect(args.where.razaoSocial).toEqual({ contains: "residencial", mode: "insensitive" });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(10);

    expect(resultado).toEqual({ items: [{ id: "obra_1" }], total: 1, page: 1, pageSize: 10 });
  });

  it("paginates using page and pageSize", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, { page: 3, pageSize: 20 });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.skip).toBe(40);
    expect(args.take).toBe(20);
  });

  it("omits filters that were not provided", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, {});

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where).toEqual({});
  });

  it("filters by categoria, subcategoria, tipoObra, tipoArea, zona, destinacao, tipoResponsavel", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, {
      categoria: "OBRA_CONSTRUCAO_CIVIL",
      subcategoria: ["OBRA_NOVA", "REFORMA"],
      tipoObra: ["ALVENARIA"],
      tipoArea: ["PRINCIPAL"],
      zona: ["URBANA"],
      destinacao: ["RESIDENCIAL_UNIFAMILIAR"],
      tipoResponsavel: ["PESSOA_FISICA"],
    });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.categoria).toBe("OBRA_CONSTRUCAO_CIVIL");
    expect(args.where.subcategoria).toEqual({ in: ["OBRA_NOVA", "REFORMA"] });
    expect(args.where.tipoObra).toEqual({ in: ["ALVENARIA"] });
    expect(args.where.tipoArea).toEqual({ in: ["PRINCIPAL"] });
    expect(args.where.zona).toEqual({ in: ["URBANA"] });
    expect(args.where.destinacao).toEqual({ in: ["RESIDENCIAL_UNIFAMILIAR"] });
    expect(args.where.tipoResponsavel).toEqual({ in: ["PESSOA_FISICA"] });
  });

  it("maps metragemFaixa to an areaConstruida gte/lte range", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, { metragemFaixa: "100_A_250" });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.areaConstruida).toEqual({ gte: 100, lte: 250 });
  });

  it("maps the open-ended top metragemFaixa to gte only", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, { metragemFaixa: "ACIMA_DE_20000" });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.areaConstruida).toEqual({ gte: 20000 });
  });

  it("filters by dataInicio range", async () => {
    const prisma = mockPrisma([], 0);
    const de = new Date("2026-01-01T00:00:00.000Z");
    const ate = new Date("2026-06-30T00:00:00.000Z");

    await buscarObras(prisma, { dataInicioDe: de, dataInicioAte: ate });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.dataInicio).toEqual({ gte: de, lte: ate });
  });

  it("excludes obras hidden by the given usuarioId", async () => {
    const prisma = mockPrisma([], 0);

    await buscarObras(prisma, { usuarioIdParaExcluirOcultas: "user_1" });

    const args = prisma.obra.findMany.mock.calls[0][0];
    expect(args.where.ocultas).toEqual({ none: { usuarioId: "user_1" } });
  });
});
