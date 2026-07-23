import type { PrismaClient } from "@conecta-obras/db";

export interface AlternarFavoritoInput {
  usuarioId: string;
  obraId: string;
}

export interface AlternarFavoritoResultado {
  favoritado: boolean;
}

export async function alternarFavorito(
  prisma: PrismaClient,
  input: AlternarFavoritoInput
): Promise<AlternarFavoritoResultado> {
  const existente = await prisma.obraFavorito.findFirst({
    where: { usuarioId: input.usuarioId, obraId: input.obraId },
  });

  if (existente) {
    await prisma.obraFavorito.delete({ where: { id: existente.id } });
    return { favoritado: false };
  }

  await prisma.obraFavorito.create({
    data: { usuarioId: input.usuarioId, obraId: input.obraId },
  });
  return { favoritado: true };
}

export interface OcultarObraInput {
  usuarioId: string;
  obraId: string;
}

export async function ocultarObra(prisma: PrismaClient, input: OcultarObraInput) {
  return prisma.obraOculta.upsert({
    where: { usuarioId_obraId: { usuarioId: input.usuarioId, obraId: input.obraId } },
    create: { usuarioId: input.usuarioId, obraId: input.obraId },
    update: {},
  });
}
