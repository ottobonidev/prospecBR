import bcrypt from "bcryptjs";
import type { PrismaClient } from "@conecta-obras/db";

export interface CriarContaInput {
  nomeEmpresa: string;
  cnpj: string;
  nome: string;
  email: string;
  senha: string;
}

export async function criarContaComLojista(
  prisma: PrismaClient,
  input: CriarContaInput
) {
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: input.email },
  });
  if (emailExistente) {
    throw new Error("EMAIL_EM_USO");
  }

  const cnpjExistente = await prisma.conta.findUnique({
    where: { cnpj: input.cnpj },
  });
  if (cnpjExistente) {
    throw new Error("CNPJ_EM_USO");
  }

  const senhaHash = await bcrypt.hash(input.senha, 10);

  return prisma.$transaction(async (tx) => {
    const conta = await tx.conta.create({
      data: { nomeEmpresa: input.nomeEmpresa, cnpj: input.cnpj },
    });
    const usuario = await tx.usuario.create({
      data: {
        contaId: conta.id,
        nome: input.nome,
        email: input.email,
        senhaHash,
        papel: "LOJISTA",
      },
    });
    return { conta, usuario };
  });
}
