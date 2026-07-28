import { prisma, type Obra } from "@conecta-obras/db";
import { CrmTabs } from "@/components/crm-tabs";
import type { ObraResumo } from "@/components/obra-card";
import { getSessionContext } from "@/lib/session";
import { listarAcompanhamentos } from "@/lib/services/obraAcompanhamento";
import { listarAgendamentos } from "@/lib/services/obraAgendamento";
import { listarFavoritos, listarOcultas } from "@/lib/services/obraFavoritos";

function serializarObra(obra: Obra): ObraResumo {
  return {
    id: obra.id,
    cno: obra.cno,
    razaoSocial: obra.razaoSocial,
    responsavelNome: obra.responsavelNome,
    uf: obra.uf,
    cidade: obra.cidade,
    bairro: obra.bairro,
    status: obra.status,
    subcategoria: obra.subcategoria,
    tipoObra: obra.tipoObra,
    tipoArea: obra.tipoArea,
    destinacao: obra.destinacao,
    areaConstruida: obra.areaConstruida,
    areaTotal: obra.areaTotal,
    valorInvestimentoCentavos: obra.valorInvestimentoCentavos,
    dataInicio: obra.dataInicio?.toISOString() ?? null,
    previsaoTermino: obra.previsaoTermino?.toISOString() ?? null,
    enderecoCompleto: obra.enderecoCompleto,
    complemento: obra.complemento,
  };
}

export default async function CrmPage() {
  const ctx = await getSessionContext();
  const [favoritos, ocultas, acompanhamentos, agendamentos] = await Promise.all([
    listarFavoritos(prisma, { usuarioId: ctx.userId }),
    listarOcultas(prisma, { usuarioId: ctx.userId }),
    listarAcompanhamentos(prisma, { usuarioId: ctx.userId }),
    listarAgendamentos(prisma, { usuarioId: ctx.userId }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">CRM</h1>
        <p className="mt-1 text-sm text-slate-600">
          Favoritos, acompanhamentos, agenda e excluidos do seu usuario.
        </p>
      </div>

      <CrmTabs
        favoritos={favoritos.map((item) => ({
          id: item.id,
          criadoEm: item.criadoEm.toISOString(),
          obra: serializarObra(item.obra),
        }))}
        acompanhamentos={acompanhamentos.map((item) => ({
          id: item.id,
          status: item.status,
          temperatura: item.temperatura,
          probabilidade: item.probabilidade,
          anotacoes: item.anotacoes,
          criadoEm: item.criadoEm.toISOString(),
          obra: serializarObra(item.obra),
        }))}
        agendamentos={agendamentos.map((item) => ({
          id: item.id,
          dataHora: item.dataHora.toISOString(),
          titulo: item.titulo,
          descricao: item.descricao,
          criadoEm: item.criadoEm.toISOString(),
          obra: serializarObra(item.obra),
        }))}
        ocultas={ocultas.map((item) => ({
          id: item.id,
          criadoEm: item.criadoEm.toISOString(),
          obra: serializarObra(item.obra),
        }))}
      />
    </div>
  );
}
