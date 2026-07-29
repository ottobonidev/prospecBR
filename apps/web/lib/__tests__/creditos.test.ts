import { describe, it, expect, vi } from "vitest";
import {
  mesReferenciaAtual,
  registrarConsumoLeadsSearch,
  obterResumoCreditosMes,
  definirAlocacaoVendedor,
} from "../services/creditos";

describe("mesReferenciaAtual", () => {
  it("formats as YYYY-MM using UTC", () => {
    expect(mesReferenciaAtual(new Date("2026-07-22T10:00:00.000Z"))).toBe("2026-07");
    expect(mesReferenciaAtual(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01");
  });
});

function mockPrismaConsumo(
  plano: { id: string; cotaMensalGratis: number } | null,
  consumidoNoMes: number,
  usuario: any = { id: "user_1", contaId: "conta_1" }
) {
  const ledgerCreate = vi.fn().mockResolvedValue({ id: "entry_1" });
  const ledgerCount = vi.fn().mockResolvedValue(consumidoNoMes);
  const queryRaw = vi.fn().mockResolvedValue(plano ? [plano] : []);
  const usuarioFindUnique = vi.fn().mockResolvedValue(usuario);
  const prisma = {
    $transaction: vi.fn().mockImplementation(async (fn: any) =>
      fn({
        $queryRaw: queryRaw,
        creditLedgerEntry: { count: ledgerCount, create: ledgerCreate },
        usuario: { findUnique: usuarioFindUnique },
      })
    ),
  } as any;
  return { prisma, ledgerCreate, ledgerCount, queryRaw, usuarioFindUnique };
}

describe("registrarConsumoLeadsSearch", () => {
  it("marks the search as free when under the monthly quota", async () => {
    const { prisma, ledgerCreate } = mockPrismaConsumo({ id: "plan_1", cotaMensalGratis: 50 }, 10);

    const resultado = await registrarConsumoLeadsSearch(prisma, {
      contaId: "conta_1",
      usuarioId: "user_1",
      tipo: "LEADS_SEARCH",
    });

    expect(resultado.excedente).toBe(false);
    expect(ledgerCreate).toHaveBeenCalledOnce();
    expect(ledgerCreate.mock.calls[0][0].data.excedente).toBe(false);
  });

  it("locks the tenant's CreditPlan row via a raw FOR UPDATE query before reading consumption", async () => {
    const { prisma, queryRaw } = mockPrismaConsumo({ id: "plan_1", cotaMensalGratis: 50 }, 10);

    await registrarConsumoLeadsSearch(prisma, {
      contaId: "conta_1",
      usuarioId: "user_1",
      tipo: "LEADS_SEARCH",
    });

    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it("marks the search as excedente once the monthly quota is reached", async () => {
    const { prisma, ledgerCreate } = mockPrismaConsumo({ id: "plan_1", cotaMensalGratis: 50 }, 50);

    const resultado = await registrarConsumoLeadsSearch(prisma, {
      contaId: "conta_1",
      usuarioId: "user_1",
      tipo: "LEADS_SEARCH",
    });

    expect(resultado.excedente).toBe(true);
    expect(ledgerCreate.mock.calls[0][0].data.excedente).toBe(true);
  });

  it("marks the last free search (quota - 1 already consumed) as free", async () => {
    const { prisma } = mockPrismaConsumo({ id: "plan_1", cotaMensalGratis: 50 }, 49);

    const resultado = await registrarConsumoLeadsSearch(prisma, {
      contaId: "conta_1",
      usuarioId: "user_1",
      tipo: "LEADS_SEARCH",
    });

    expect(resultado.excedente).toBe(false);
  });

  it("throws if the tenant has no CreditPlan", async () => {
    const { prisma } = mockPrismaConsumo(null, 0);

    await expect(
      registrarConsumoLeadsSearch(prisma, {
        contaId: "conta_1",
        usuarioId: "user_1",
        tipo: "LEADS_SEARCH",
      })
    ).rejects.toThrow("PLANO_DE_CREDITO_NAO_ENCONTRADO");
  });

  it("throws if the usuario does not belong to the conta, without writing to the ledger", async () => {
    const { prisma, ledgerCreate } = mockPrismaConsumo({ id: "plan_1", cotaMensalGratis: 50 }, 10, {
      id: "user_1",
      contaId: "conta_OUTRA",
    });

    await expect(
      registrarConsumoLeadsSearch(prisma, {
        contaId: "conta_1",
        usuarioId: "user_1",
        tipo: "LEADS_SEARCH",
      })
    ).rejects.toThrow("USUARIO_NAO_PERTENCE_A_CONTA");

    expect(ledgerCreate).not.toHaveBeenCalled();
  });
});

describe("obterResumoCreditosMes", () => {
  it("returns quota, consumed and remaining for the current month", async () => {
    const prisma = {
      creditPlan: { findUnique: vi.fn().mockResolvedValue({ id: "plan_1", cotaMensalGratis: 50 }) },
      creditLedgerEntry: { count: vi.fn().mockResolvedValue(12) },
    } as any;

    const resumo = await obterResumoCreditosMes(prisma, "conta_1");

    expect(resumo).toEqual({ cotaMensalGratis: 50, consumidoNoMes: 12, restante: 38 });
  });

  it("clamps restante at 0 when consumption exceeds quota", async () => {
    const prisma = {
      creditPlan: { findUnique: vi.fn().mockResolvedValue({ id: "plan_1", cotaMensalGratis: 50 }) },
      creditLedgerEntry: { count: vi.fn().mockResolvedValue(70) },
    } as any;

    const resumo = await obterResumoCreditosMes(prisma, "conta_1");

    expect(resumo.restante).toBe(0);
  });

  it("throws if the tenant has no CreditPlan", async () => {
    const prisma = {
      creditPlan: { findUnique: vi.fn().mockResolvedValue(null) },
      creditLedgerEntry: { count: vi.fn() },
    } as any;

    await expect(obterResumoCreditosMes(prisma, "conta_1")).rejects.toThrow(
      "PLANO_DE_CREDITO_NAO_ENCONTRADO"
    );
  });
});

describe("definirAlocacaoVendedor", () => {
  it("upserts the allocation for a conta+usuario pair", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "alloc_1", cotaAlocada: 15 });
    const usuarioFindUnique = vi.fn().mockResolvedValue({ id: "user_2", contaId: "conta_1" });
    const prisma = {
      creditAllocation: { upsert },
      usuario: { findUnique: usuarioFindUnique },
    } as any;

    const resultado = await definirAlocacaoVendedor(prisma, {
      contaId: "conta_1",
      usuarioId: "user_2",
      cotaAlocada: 15,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { contaId_usuarioId: { contaId: "conta_1", usuarioId: "user_2" } },
      create: { contaId: "conta_1", usuarioId: "user_2", cotaAlocada: 15 },
      update: { cotaAlocada: 15 },
    });
    expect(resultado.cotaAlocada).toBe(15);
  });

  it("throws if the usuario does not belong to the conta, without upserting", async () => {
    const upsert = vi.fn();
    const usuarioFindUnique = vi.fn().mockResolvedValue({ id: "user_2", contaId: "conta_OUTRA" });
    const prisma = {
      creditAllocation: { upsert },
      usuario: { findUnique: usuarioFindUnique },
    } as any;

    await expect(
      definirAlocacaoVendedor(prisma, {
        contaId: "conta_1",
        usuarioId: "user_2",
        cotaAlocada: 15,
      })
    ).rejects.toThrow("USUARIO_NAO_PERTENCE_A_CONTA");

    expect(upsert).not.toHaveBeenCalled();
  });
});
