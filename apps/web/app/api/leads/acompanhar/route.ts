import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prisma,
  StatusAcompanhamento,
  TemperaturaLead,
} from "@conecta-obras/db";
import { getSessionContext, UnauthorizedError } from "@/lib/session";
import {
  salvarAcompanhamento,
  buscarAcompanhamento,
} from "@/lib/services/obraAcompanhamento";

const postSchema = z.object({
  obraId: z.string().min(1),
  status: z.nativeEnum(StatusAcompanhamento),
  temperatura: z.nativeEnum(TemperaturaLead).nullish(),
  probabilidade: z
    .union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(90)])
    .nullish(),
  anotacoes: z.string().nullish(),
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

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const acompanhamento = await salvarAcompanhamento(prisma, {
      usuarioId: ctx.userId,
      contaId: ctx.contaId,
      obraId: parsed.data.obraId,
      status: parsed.data.status,
      temperatura: parsed.data.temperatura,
      probabilidade: parsed.data.probabilidade,
      anotacoes: parsed.data.anotacoes,
    });

    return NextResponse.json(acompanhamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getSessionContext();
    const { searchParams } = new URL(request.url);
    const obraId = searchParams.get("obraId");

    if (!obraId) {
      return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
    }

    const acompanhamento = await buscarAcompanhamento(prisma, {
      usuarioId: ctx.userId,
      obraId,
    });

    return NextResponse.json(acompanhamento);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ error: "ERRO_INTERNO" }, { status: 500 });
  }
}
