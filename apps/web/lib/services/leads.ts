import type {
  CategoriaObra,
  DestinacaoObra,
  Obra,
  PrismaClient,
  StatusObra,
  SubcategoriaObra,
  TipoArea,
  TipoObra,
  TipoResponsavel,
  Zona,
} from "@conecta-obras/db";

export const FAIXAS_METRAGEM = {
  ATE_100: { gte: 0, lte: 100 },
  "100_A_250": { gte: 100, lte: 250 },
  "250_A_500": { gte: 250, lte: 500 },
  "500_A_750": { gte: 500, lte: 750 },
  "750_A_1000": { gte: 750, lte: 1000 },
  "1000_A_3000": { gte: 1000, lte: 3000 },
  "3000_A_20000": { gte: 3000, lte: 20000 },
  ACIMA_DE_20000: { gte: 20000 },
} as const;

export type FaixaMetragem = keyof typeof FAIXAS_METRAGEM;

export interface BuscarObrasInput {
  uf?: string[];
  cidade?: string;
  status?: StatusObra[];
  palavraChave?: string;
  categoria?: CategoriaObra;
  subcategoria?: SubcategoriaObra[];
  tipoObra?: TipoObra[];
  tipoArea?: TipoArea[];
  zona?: Zona[];
  destinacao?: DestinacaoObra[];
  tipoResponsavel?: TipoResponsavel[];
  metragemFaixa?: FaixaMetragem;
  dataInicioDe?: Date;
  dataInicioAte?: Date;
  usuarioIdParaExcluirOcultas?: string;
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
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.subcategoria && input.subcategoria.length > 0
      ? { subcategoria: { in: input.subcategoria } }
      : {}),
    ...(input.tipoObra && input.tipoObra.length > 0 ? { tipoObra: { in: input.tipoObra } } : {}),
    ...(input.tipoArea && input.tipoArea.length > 0 ? { tipoArea: { in: input.tipoArea } } : {}),
    ...(input.zona && input.zona.length > 0 ? { zona: { in: input.zona } } : {}),
    ...(input.destinacao && input.destinacao.length > 0
      ? { destinacao: { in: input.destinacao } }
      : {}),
    ...(input.tipoResponsavel && input.tipoResponsavel.length > 0
      ? { tipoResponsavel: { in: input.tipoResponsavel } }
      : {}),
    ...(input.metragemFaixa ? { areaConstruida: FAIXAS_METRAGEM[input.metragemFaixa] } : {}),
    ...(input.dataInicioDe || input.dataInicioAte
      ? {
          dataInicio: {
            ...(input.dataInicioDe ? { gte: input.dataInicioDe } : {}),
            ...(input.dataInicioAte ? { lte: input.dataInicioAte } : {}),
          },
        }
      : {}),
    ...(input.usuarioIdParaExcluirOcultas
      ? { ocultas: { none: { usuarioId: input.usuarioIdParaExcluirOcultas } } }
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
