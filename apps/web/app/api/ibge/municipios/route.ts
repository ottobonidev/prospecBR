import { NextResponse } from "next/server";
import { obterCache, definirCache } from "@/lib/ibgeMunicipiosCache";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf");

  if (!uf) {
    return NextResponse.json({ error: "UF_OBRIGATORIA" }, { status: 400 });
  }

  const agora = Date.now();
  const emCache = obterCache(uf);
  if (emCache && emCache.expiraEm > agora) {
    return NextResponse.json(emCache.municipios);
  }

  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
  if (!res.ok) {
    return NextResponse.json({ error: "IBGE_INDISPONIVEL" }, { status: 502 });
  }

  const dados: { nome: string }[] = await res.json();
  const municipios = dados.map((m) => ({ nome: m.nome }));

  definirCache(uf, { municipios, expiraEm: agora + CACHE_TTL_MS });

  return NextResponse.json(municipios);
}
