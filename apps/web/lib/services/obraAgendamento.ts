import type { PrismaClient } from "@conecta-obras/db";

export interface CriarAgendamentoInput {
  usuarioId: string;
  contaId: string;
  obraId: string;
  dataHora: Date;
  titulo: string;
  descricao?: string | null;
}

export async function criarAgendamento(
  prisma: PrismaClient,
  input: CriarAgendamentoInput
) {
  return prisma.agendamento.create({
    data: {
      contaId: input.contaId,
      usuarioId: input.usuarioId,
      obraId: input.obraId,
      dataHora: input.dataHora,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
    },
  });
}
