import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { aceitarConvite } from "@/lib/services/convites";

const schema = z.object({
  nome: z.string().min(2),
  senha: z.string().min(8),
});

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
  }

  try {
    await aceitarConvite(prisma, { token: params.token, ...parsed.data });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_INTERNO";
    const status = message.startsWith("CONVITE_") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
