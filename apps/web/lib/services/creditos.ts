import type { Prisma, PrismaClient } from "@conecta-obras/db";

export function mesReferenciaAtual(data: Date = new Date()): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export interface RegistrarConsumoInput {
  contaId: string;
  usuarioId: string;
  tipo: "LEADS_SEARCH";
}

export interface RegistrarConsumoResultado {
  excedente: boolean;
}

export async function registrarConsumoLeadsSearch(
  prisma: PrismaClient,
  input: RegistrarConsumoInput
): Promise<RegistrarConsumoResultado> {
  const mesReferencia = mesReferenciaAtual();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const usuario = await tx.usuario.findUnique({ where: { id: input.usuarioId } });
    if (!usuario || usuario.contaId !== input.contaId) {
      throw new Error("USUARIO_NAO_PERTENCE_A_CONTA");
    }

    const plano = await tx.creditPlan.findUnique({ where: { contaId: input.contaId } });
    if (!plano) {
      throw new Error("PLANO_DE_CREDITO_NAO_ENCONTRADO");
    }

    const consumidoNoMes = await tx.creditLedgerEntry.count({
      where: { contaId: input.contaId, mesReferencia, tipo: input.tipo },
    });

    const excedente = consumidoNoMes >= plano.cotaMensalGratis;

    await tx.creditLedgerEntry.create({
      data: {
        contaId: input.contaId,
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        excedente,
        mesReferencia,
      },
    });

    return { excedente };
  });
}

export interface ResumoCreditosMes {
  cotaMensalGratis: number;
  consumidoNoMes: number;
  restante: number;
}

export async function obterResumoCreditosMes(
  prisma: PrismaClient,
  contaId: string
): Promise<ResumoCreditosMes> {
  const plano = await prisma.creditPlan.findUnique({ where: { contaId } });
  if (!plano) {
    throw new Error("PLANO_DE_CREDITO_NAO_ENCONTRADO");
  }

  const mesReferencia = mesReferenciaAtual();
  const consumidoNoMes = await prisma.creditLedgerEntry.count({
    where: { contaId, mesReferencia },
  });

  return {
    cotaMensalGratis: plano.cotaMensalGratis,
    consumidoNoMes,
    restante: Math.max(0, plano.cotaMensalGratis - consumidoNoMes),
  };
}

export interface DefinirAlocacaoInput {
  contaId: string;
  usuarioId: string;
  cotaAlocada: number;
}

export async function definirAlocacaoVendedor(
  prisma: PrismaClient,
  input: DefinirAlocacaoInput
) {
  const usuario = await prisma.usuario.findUnique({ where: { id: input.usuarioId } });
  if (!usuario || usuario.contaId !== input.contaId) {
    throw new Error("USUARIO_NAO_PERTENCE_A_CONTA");
  }

  return prisma.creditAllocation.upsert({
    where: { contaId_usuarioId: { contaId: input.contaId, usuarioId: input.usuarioId } },
    create: {
      contaId: input.contaId,
      usuarioId: input.usuarioId,
      cotaAlocada: input.cotaAlocada,
    },
    update: { cotaAlocada: input.cotaAlocada },
  });
}
