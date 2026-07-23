import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import { criarAgendamento } from "@/lib/services/obraAgendamento";

const schema = z.object({
  obraId: z.string().min(1),
  dataHora: z.coerce.date(),
  titulo: z.string().min(1),
  descricao: z.string().nullish(),
});

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

    const agendamento = await criarAgendamento(prisma, {
      usuarioId: ctx.userId,
      contaId: ctx.contaId,
      obraId: parsed.data.obraId,
      dataHora: parsed.data.dataHora,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
    });

    return NextResponse.json(agendamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
