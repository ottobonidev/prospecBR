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
  /**
   * Busca obras atualizadas na fonte a partir do cursor informado.
   *
   * Contrato (obrigatório para qualquer implementação):
   * - Os resultados PODEM ser truncados pela implementação (ex.: LIMIT na query).
   * - Quando truncados, as linhas retornadas DEVEM ser as de menor
   *   `atualizadoEmFonte` igual ou posterior ao cursor (ordenação ascendente
   *   ANTES de aplicar qualquer limite) — caso contrário, o cursor baseado no
   *   máximo retornado pelo chamador pularia silenciosamente linhas ainda não
   *   buscadas.
   * - O limite do cursor é INCLUSIVO (`>=`): linhas exatamente no cursor podem
   *   ser retornadas de novo. Os chamadores dependem de upserts idempotentes
   *   para absorver essas repetições de fronteira.
   */
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
