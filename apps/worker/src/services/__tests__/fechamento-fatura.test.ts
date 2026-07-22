import { describe, it, expect, vi } from "vitest";
import { fecharFaturaMensal } from "../fechamento-fatura";

function makePrisma(overrides: {
  groupBy?: ReturnType<typeof vi.fn>;
  planFindUnique?: ReturnType<typeof vi.fn>;
  faturaFindUnique?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}) {
  return {
    creditLedgerEntry: { groupBy: overrides.groupBy ?? vi.fn().mockResolvedValue([]) },
    creditPlan: { findUnique: overrides.planFindUnique ?? vi.fn() },
    faturaMensal: {
      findUnique: overrides.faturaFindUnique ?? vi.fn().mockResolvedValue(null),
      create: overrides.create ?? vi.fn().mockResolvedValue({}),
      update: overrides.update ?? vi.fn().mockResolvedValue({}),
    },
  } as any;
}

describe("fecharFaturaMensal", () => {
  it("creates one invoice per tenant with excedente entries, priced at the sale price", async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { contaId: "conta_1", _count: { _all: 12 } },
      { contaId: "conta_2", _count: { _all: 3 } },
    ]);
    const planFindUnique = vi
      .fn()
      .mockResolvedValueOnce({ precoVendaLeadsCentavos: 40 })
      .mockResolvedValueOnce({ precoVendaLeadsCentavos: 40 });
    const create = vi.fn().mockResolvedValue({});
    const prisma = makePrisma({ groupBy, planFindUnique, create });

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(groupBy).toHaveBeenCalledWith({
      by: ["contaId"],
      where: { mesReferencia: "2026-07", excedente: true },
      _count: { _all: true },
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(prisma.faturaMensal.update).not.toHaveBeenCalled();

    const conta1Args = create.mock.calls[0][0];
    expect(conta1Args.data.contaId).toBe("conta_1");
    expect(conta1Args.data.mesReferencia).toBe("2026-07");
    expect(conta1Args.data.quantidadeExcedente).toBe(12);
    expect(conta1Args.data.valorTotalCentavos).toBe(12 * 40);
    expect(conta1Args.data.status).toBe("PENDENTE");

    expect(resultado.faturasGeradas).toBe(2);
    expect(resultado.contasSemPlano).toEqual([]);
  });

  it("skips tenants with zero excedente entries", async () => {
    const prisma = makePrisma({ groupBy: vi.fn().mockResolvedValue([]) });

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(resultado.faturasGeradas).toBe(0);
    expect(resultado.contasSemPlano).toEqual([]);
    expect(prisma.faturaMensal.create).not.toHaveBeenCalled();
    expect(prisma.faturaMensal.update).not.toHaveBeenCalled();
  });

  it("never mutates a PAGA invoice and still processes other tenants", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const groupBy = vi.fn().mockResolvedValue([
      { contaId: "conta_paga", _count: { _all: 5 } },
      { contaId: "conta_pendente", _count: { _all: 2 } },
    ]);
    const planFindUnique = vi.fn().mockResolvedValue({ precoVendaLeadsCentavos: 50 });
    const faturaFindUnique = vi
      .fn()
      .mockResolvedValueOnce({ status: "PAGA" })
      .mockResolvedValueOnce({ status: "PENDENTE" });
    const create = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({});
    const prisma = makePrisma({ groupBy, planFindUnique, faturaFindUnique, create, update });

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where).toEqual({
      contaId_mesReferencia: { contaId: "conta_pendente", mesReferencia: "2026-07" },
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("conta_paga"));
    expect(resultado.faturasGeradas).toBe(1);

    warnSpy.mockRestore();
  });

  it("updates a PENDENTE invoice with recomputed values without touching status", async () => {
    const groupBy = vi.fn().mockResolvedValue([{ contaId: "conta_1", _count: { _all: 7 } }]);
    const planFindUnique = vi.fn().mockResolvedValue({ precoVendaLeadsCentavos: 30 });
    const faturaFindUnique = vi.fn().mockResolvedValue({ status: "PENDENTE" });
    const update = vi.fn().mockResolvedValue({});
    const prisma = makePrisma({ groupBy, planFindUnique, faturaFindUnique, update });

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(prisma.faturaMensal.create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    const updateArgs = update.mock.calls[0][0];
    expect(updateArgs.data).toEqual({ quantidadeExcedente: 7, valorTotalCentavos: 7 * 30 });
    expect(updateArgs.data).not.toHaveProperty("status");
    expect(resultado.faturasGeradas).toBe(1);
  });

  it("warns and surfaces tenants without a credit plan, writing no invoice for them", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const groupBy = vi.fn().mockResolvedValue([{ contaId: "conta_sem_plano", _count: { _all: 4 } }]);
    const planFindUnique = vi.fn().mockResolvedValue(null);
    const prisma = makePrisma({ groupBy, planFindUnique });

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("conta_sem_plano"));
    expect(resultado.contasSemPlano).toEqual(["conta_sem_plano"]);
    expect(resultado.faturasGeradas).toBe(0);
    expect(prisma.faturaMensal.findUnique).not.toHaveBeenCalled();
    expect(prisma.faturaMensal.create).not.toHaveBeenCalled();
    expect(prisma.faturaMensal.update).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
