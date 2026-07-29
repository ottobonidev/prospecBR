import type { PrismaClient } from "@conecta-obras/db";

export interface FecharFaturaMensalResultado {
  faturasGeradas: number;
  contasSemPlano: string[];
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
  const contasSemPlano: string[] = [];

  for (const grupo of excedentesPorConta) {
    const quantidadeExcedente = grupo._count._all;

    const plano = await prisma.creditPlan.findUnique({ where: { contaId: grupo.contaId } });
    if (!plano) {
      console.warn(
        `[fechamento-fatura] conta ${grupo.contaId} sem CreditPlan em ${mesReferencia} — ${quantidadeExcedente} excedente(s) nao faturados`
      );
      contasSemPlano.push(grupo.contaId);
      continue;
    }

    const valorTotalCentavos = quantidadeExcedente * plano.precoVendaLeadsCentavos;

    const existente = await prisma.faturaMensal.findUnique({
      where: { contaId_mesReferencia: { contaId: grupo.contaId, mesReferencia } },
    });

    if (existente?.status === "PAGA") {
      console.warn(
        `[fechamento-fatura] fatura ja PAGA para conta ${grupo.contaId} em ${mesReferencia} — recomputo ignorado (quantidade atual ${quantidadeExcedente} difere? valor pago preservado)`
      );
      continue;
    }

    if (!existente) {
      await prisma.faturaMensal.create({
        data: {
          contaId: grupo.contaId,
          mesReferencia,
          quantidadeExcedente,
          valorTotalCentavos,
          status: "PENDENTE",
        },
      });
    } else {
      await prisma.faturaMensal.update({
        where: { contaId_mesReferencia: { contaId: grupo.contaId, mesReferencia } },
        data: { quantidadeExcedente, valorTotalCentavos },
      });
    }

    faturasGeradas += 1;
  }

  return { faturasGeradas, contasSemPlano };
}
