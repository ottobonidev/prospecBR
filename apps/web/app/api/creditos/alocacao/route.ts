import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, ForbiddenError, UnauthorizedError } from "@/lib/session";
import { definirAlocacaoVendedor } from "@/lib/services/creditos";

const schema = z.object({
  usuarioId: z.string().min(1),
  cotaAlocada: z.coerce.number().int().min(0),
});

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();
    ctx.requireLojista();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const alocacao = await definirAlocacaoVendedor(prisma, {
      contaId: ctx.contaId,
      usuarioId: parsed.data.usuarioId,
      cotaAlocada: parsed.data.cotaAlocada,
    });

    return NextResponse.json(alocacao, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "USUARIO_NAO_PERTENCE_A_CONTA") {
      return NextResponse.json({ error: "USUARIO_NAO_PERTENCE_A_CONTA" }, { status: 404 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
