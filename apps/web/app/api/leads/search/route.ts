import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prisma,
  CategoriaObra,
  DestinacaoObra,
  StatusObra,
  SubcategoriaObra,
  TipoArea,
  TipoObra,
  TipoResponsavel,
  Zona,
} from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import { buscarObras, FAIXAS_METRAGEM } from "@/lib/services/leads";
import { registrarConsumoLeadsSearch } from "@/lib/services/creditos";

const querySchema = z.object({
  uf: z.array(z.string()).optional(),
  cidade: z.string().optional(),
  status: z.array(z.nativeEnum(StatusObra)).optional(),
  palavraChave: z.string().optional(),
  categoria: z.nativeEnum(CategoriaObra).optional(),
  subcategoria: z.array(z.nativeEnum(SubcategoriaObra)).optional(),
  tipoObra: z.array(z.nativeEnum(TipoObra)).optional(),
  tipoArea: z.array(z.nativeEnum(TipoArea)).optional(),
  zona: z.array(z.nativeEnum(Zona)).optional(),
  destinacao: z.array(z.nativeEnum(DestinacaoObra)).optional(),
  tipoResponsavel: z.array(z.nativeEnum(TipoResponsavel)).optional(),
  metragemFaixa: z.enum(Object.keys(FAIXAS_METRAGEM) as [string, ...string[]]).optional(),
  dataInicioDe: z.coerce.date().optional(),
  dataInicioAte: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

function getAllOrUndefined(searchParams: URLSearchParams, chave: string) {
  const valores = searchParams.getAll(chave);
  return valores.length ? valores : undefined;
}

export async function GET(request: Request) {
  try {
    const ctx = await getSessionContext();
    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      uf: getAllOrUndefined(searchParams, "uf"),
      cidade: searchParams.get("cidade") ?? undefined,
      status: getAllOrUndefined(searchParams, "status"),
      palavraChave: searchParams.get("palavraChave") ?? undefined,
      categoria: searchParams.get("categoria") ?? undefined,
      subcategoria: getAllOrUndefined(searchParams, "subcategoria"),
      tipoObra: getAllOrUndefined(searchParams, "tipoObra"),
      tipoArea: getAllOrUndefined(searchParams, "tipoArea"),
      zona: getAllOrUndefined(searchParams, "zona"),
      destinacao: getAllOrUndefined(searchParams, "destinacao"),
      tipoResponsavel: getAllOrUndefined(searchParams, "tipoResponsavel"),
      metragemFaixa: searchParams.get("metragemFaixa") ?? undefined,
      dataInicioDe: searchParams.get("dataInicioDe") ?? undefined,
      dataInicioAte: searchParams.get("dataInicioAte") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const resultado = await buscarObras(prisma, {
      ...parsed.data,
      metragemFaixa: parsed.data.metragemFaixa as keyof typeof FAIXAS_METRAGEM | undefined,
      usuarioIdParaExcluirOcultas: ctx.userId,
    });

    const { excedente } = await registrarConsumoLeadsSearch(prisma, {
      contaId: ctx.contaId,
      usuarioId: ctx.userId,
      tipo: "LEADS_SEARCH",
    });

    return NextResponse.json({ ...resultado, excedente });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USUARIO_NAO_PERTENCE_A_CONTA") {
      return NextResponse.json({ error: "USUARIO_NAO_PERTENCE_A_CONTA" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "PLANO_DE_CREDITO_NAO_ENCONTRADO") {
      return NextResponse.json({ error: "PLANO_DE_CREDITO_NAO_ENCONTRADO" }, { status: 500 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
