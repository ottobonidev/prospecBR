import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "@conecta-obras/db";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export interface GerarConviteInput {
  contaId: string;
  email: string;
}

export async function gerarConviteVendedor(
  prisma: PrismaClient,
  input: GerarConviteInput
) {
  const token = crypto.randomBytes(24).toString("hex");
  return prisma.conviteVendedor.create({
    data: {
      contaId: input.contaId,
      email: input.email,
      token,
      expiraEm: new Date(Date.now() + SETE_DIAS_MS),
    },
  });
}

export interface AceitarConviteInput {
  token: string;
  nome: string;
  senha: string;
}

export async function aceitarConvite(prisma: PrismaClient, input: AceitarConviteInput) {
  const convite = await prisma.conviteVendedor.findUnique({
    where: { token: input.token },
  });

  if (!convite) {
    throw new Error("CONVITE_INVALIDO");
  }
  if (convite.aceitoEm) {
    throw new Error("CONVITE_JA_ACEITO");
  }
  if (convite.expiraEm.getTime() < Date.now()) {
    throw new Error("CONVITE_EXPIRADO");
  }

  const senhaHash = await bcrypt.hash(input.senha, 10);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const usuario = await tx.usuario.create({
      data: {
        contaId: convite.contaId,
        nome: input.nome,
        email: convite.email,
        senhaHash,
        papel: "VENDEDOR",
      },
    });
    await tx.conviteVendedor.update({
      where: { id: convite.id },
      data: { aceitoEm: new Date() },
    });
    return usuario;
  });
}
