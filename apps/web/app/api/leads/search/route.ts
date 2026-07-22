import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type StatusObra } from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import { buscarObras } from "@/lib/services/leads";
import { registrarConsumoLeadsSearch } from "@/lib/services/creditos";

const querySchema = z.object({
  uf: z.array(z.string()).optional(),
  cidade: z.string().optional(),
  status: z.array(z.string()).optional(),
  palavraChave: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getSessionContext();
    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      uf: searchParams.getAll("uf").length ? searchParams.getAll("uf") : undefined,
      cidade: searchParams.get("cidade") ?? undefined,
      status: searchParams.getAll("status").length ? searchParams.getAll("status") : undefined,
      palavraChave: searchParams.get("palavraChave") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const { excedente } = await registrarConsumoLeadsSearch(prisma, {
      contaId: ctx.contaId,
      usuarioId: ctx.userId,
      tipo: "LEADS_SEARCH",
    });

    const resultado = await buscarObras(prisma, {
      ...parsed.data,
      status: parsed.data.status as StatusObra[] | undefined,
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
