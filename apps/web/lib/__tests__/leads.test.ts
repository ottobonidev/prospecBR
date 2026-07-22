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
});
