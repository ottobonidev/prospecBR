import { describe, it, expect, vi } from "vitest";
import { fecharFaturaMensal } from "../fechamento-fatura";

describe("fecharFaturaMensal", () => {
  it("creates one invoice per tenant with excedente entries, priced at the sale price", async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { contaId: "conta_1", _count: { _all: 12 } },
      { contaId: "conta_2", _count: { _all: 3 } },
    ]);
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ precoVendaLeadsCentavos: 40 })
      .mockResolvedValueOnce({ precoVendaLeadsCentavos: 40 });
    const invoiceUpsert = vi.fn().mockResolvedValue({});

    const prisma = {
      creditLedgerEntry: { groupBy },
      creditPlan: { findUnique },
      faturaMensal: { upsert: invoiceUpsert },
    } as any;

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(groupBy).toHaveBeenCalledWith({
      by: ["contaId"],
      where: { mesReferencia: "2026-07", excedente: true },
      _count: { _all: true },
    });
    expect(invoiceUpsert).toHaveBeenCalledTimes(2);

    const conta1Args = invoiceUpsert.mock.calls[0][0];
    expect(conta1Args.where).toEqual({
      contaId_mesReferencia: { contaId: "conta_1", mesReferencia: "2026-07" },
    });
    expect(conta1Args.create.quantidadeExcedente).toBe(12);
    expect(conta1Args.create.valorTotalCentavos).toBe(12 * 40);
    expect(conta1Args.create.status).toBe("PENDENTE");

    expect(resultado.faturasGeradas).toBe(2);
  });

  it("skips tenants with zero excedente entries", async () => {
    const groupBy = vi.fn().mockResolvedValue([]);
    const prisma = {
      creditLedgerEntry: { groupBy },
      creditPlan: { findUnique: vi.fn() },
      faturaMensal: { upsert: vi.fn() },
    } as any;

    const resultado = await fecharFaturaMensal(prisma, "2026-07");

    expect(resultado.faturasGeradas).toBe(0);
    expect(prisma.faturaMensal.upsert).not.toHaveBeenCalled();
  });
});
