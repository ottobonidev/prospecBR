import type { Obra, PrismaClient, StatusObra } from "@conecta-obras/db";

export interface BuscarObrasInput {
  uf?: string[];
  cidade?: string;
  status?: StatusObra[];
  palavraChave?: string;
  page?: number;
  pageSize?: number;
}

export interface BuscarObrasResultado {
  items: Obra[];
  total: number;
  page: number;
  pageSize: number;
}

// No tenant/auth scoping here: Obra is shared reference data, not tenant-owned; quota/tenant enforcement belongs to the caller.
export async function buscarObras(
  prisma: PrismaClient,
  input: BuscarObrasInput
): Promise<BuscarObrasResultado> {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 10;

  const where = {
    ...(input.uf && input.uf.length > 0 ? { uf: { in: input.uf } } : {}),
    ...(input.cidade ? { cidade: input.cidade } : {}),
    ...(input.status && input.status.length > 0 ? { status: { in: input.status } } : {}),
    ...(input.palavraChave
      ? { razaoSocial: { contains: input.palavraChave, mode: "insensitive" as const } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.obra.count({ where }),
  ]);

  return { items, total, page, pageSize };
}
