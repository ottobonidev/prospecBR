import type { PrismaClient } from "@conecta-obras/db";

export interface ObraFonte {
  cno: string;
  cnpjResponsavel: string;
  razaoSocial: string;
  uf: string;
  cidade: string;
  bairro: string | null;
  cep: string | null;
  status: "ATIVA" | "ENCERRADA" | "NULA" | "SUSPENSA" | "PARALISADA";
  dataInicio: Date | null;
  natureza: string | null;
  areaConstruida: number | null;
  atualizadoEmFonte: Date;
}

export interface ObrasFonteClient {
  buscarAtualizadasDesde(cursor: Date): Promise<ObraFonte[]>;
}

export interface SincronizarObrasResultado {
  processadas: number;
  novoCursor: Date;
}

export async function sincronizarObras(
  prisma: PrismaClient,
  fonte: ObrasFonteClient,
  cursorAtual: Date
): Promise<SincronizarObrasResultado> {
  const obras = await fonte.buscarAtualizadasDesde(cursorAtual);

  let novoCursor = cursorAtual;

  for (const obra of obras) {
    await prisma.obra.upsert({
      where: { cno: obra.cno },
      create: {
        cno: obra.cno,
        cnpjResponsavel: obra.cnpjResponsavel,
        razaoSocial: obra.razaoSocial,
        uf: obra.uf,
        cidade: obra.cidade,
        bairro: obra.bairro,
        cep: obra.cep,
        status: obra.status,
        dataInicio: obra.dataInicio,
        natureza: obra.natureza,
        areaConstruida: obra.areaConstruida,
      },
      update: {
        cnpjResponsavel: obra.cnpjResponsavel,
        razaoSocial: obra.razaoSocial,
        uf: obra.uf,
        cidade: obra.cidade,
        bairro: obra.bairro,
        cep: obra.cep,
        status: obra.status,
        dataInicio: obra.dataInicio,
        natureza: obra.natureza,
        areaConstruida: obra.areaConstruida,
      },
    });

    if (obra.atualizadoEmFonte > novoCursor) {
      novoCursor = obra.atualizadoEmFonte;
    }
  }

  return { processadas: obras.length, novoCursor };
}
