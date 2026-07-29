import type {
  PrismaClient,
  StatusAcompanhamento,
  TemperaturaLead,
} from "@conecta-obras/db";

export interface SalvarAcompanhamentoInput {
  usuarioId: string;
  contaId: string;
  obraId: string;
  status: StatusAcompanhamento;
  temperatura?: TemperaturaLead | null;
  probabilidade?: number | null;
  anotacoes?: string | null;
}

export async function salvarAcompanhamento(
  prisma: PrismaClient,
  input: SalvarAcompanhamentoInput
) {
  const campos = {
    status: input.status,
    temperatura: input.temperatura ?? null,
    probabilidade: input.probabilidade ?? null,
    anotacoes: input.anotacoes ?? null,
  };

  return prisma.acompanhamento.upsert({
    where: { usuarioId_obraId: { usuarioId: input.usuarioId, obraId: input.obraId } },
    create: {
      contaId: input.contaId,
      usuarioId: input.usuarioId,
      obraId: input.obraId,
      ...campos,
    },
    update: { ...campos },
  });
}

export async function buscarAcompanhamento(
  prisma: PrismaClient,
  input: { usuarioId: string; obraId: string }
) {
  return prisma.acompanhamento.findUnique({
    where: { usuarioId_obraId: { usuarioId: input.usuarioId, obraId: input.obraId } },
  });
}
