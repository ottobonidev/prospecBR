import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, ForbiddenError, UnauthorizedError } from "@/lib/session";
import { gerarConviteVendedor } from "@/lib/services/convites";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const ctx = await getSessionContext();
    ctx.requireLojista();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const convite = await gerarConviteVendedor(prisma, {
      contaId: ctx.contaId,
      email: parsed.data.email,
    });

    return NextResponse.json({ token: convite.token }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
