import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@conecta-obras/db";
import { criarContaComLojista } from "@/lib/services/contas";

const schema = z.object({
  nomeEmpresa: z.string().min(2),
  cnpj: z.string().min(11).max(18),
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "DADOS_INVALIDOS" }, { status: 400 });
  }

  try {
    const result = await criarContaComLojista(prisma, parsed.data);
    return NextResponse.json({ ok: true, contaId: result.conta.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_INTERNO";
    const status = message === "EMAIL_EM_USO" || message === "CNPJ_EM_USO" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
