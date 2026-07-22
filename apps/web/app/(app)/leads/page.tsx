import { prisma } from "@conecta-obras/db";
import { getSessionContext } from "@/lib/session";
import { obterResumoCreditosMes } from "@/lib/services/creditos";
import { LeadsSearchForm } from "@/components/leads-search-form";

export default async function LeadsPage() {
  const ctx = await getSessionContext();
  const resumo = await obterResumoCreditosMes(prisma, ctx.contaId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
      <LeadsSearchForm restanteInicial={resumo.restante} />
    </div>
  );
}
