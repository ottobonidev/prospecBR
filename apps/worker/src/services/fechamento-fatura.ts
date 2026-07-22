import type { PrismaClient } from "@conecta-obras/db";

export interface FecharFaturaMensalResultado {
  faturasGeradas: number;
}

export async function fecharFaturaMensal(
  prisma: PrismaClient,
  mesReferencia: string
): Promise<FecharFaturaMensalResultado> {
  const excedentesPorConta = await prisma.creditLedgerEntry.groupBy({
    by: ["contaId"],
    where: { mesReferencia, excedente: true },
    _count: { _all: true },
  });

  let faturasGeradas = 0;

  for (const grupo of excedentesPorConta) {
    const quantidadeExcedente = grupo._count._all;
    if (quantidadeExcedente === 0) continue;

    const plano = await prisma.creditPlan.findUnique({ where: { contaId: grupo.contaId } });
    if (!plano) continue;

    await prisma.faturaMensal.upsert({
      where: { contaId_mesReferencia: { contaId: grupo.contaId, mesReferencia } },
      create: {
        contaId: grupo.contaId,
        mesReferencia,
        quantidadeExcedente,
        valorTotalCentavos: quantidadeExcedente * plano.precoVendaLeadsCentavos,
        status: "PENDENTE",
      },
      update: {
        quantidadeExcedente,
        valorTotalCentavos: quantidadeExcedente * plano.precoVendaLeadsCentavos,
      },
    });

    faturasGeradas += 1;
  }

  return { faturasGeradas };
}
