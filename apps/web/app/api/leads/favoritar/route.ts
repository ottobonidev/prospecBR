import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import { alternarFavorito } from "@/lib/services/obraFavoritos";

const schema = z.object({ obraId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();

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

    const resultado = await alternarFavorito(prisma, {
      usuarioId: ctx.userId,
      obraId: parsed.data.obraId,
    });

    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
