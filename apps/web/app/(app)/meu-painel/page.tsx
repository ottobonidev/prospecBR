import { prisma } from "@conecta-obras/db";
import { getSessionContext } from "@/lib/session";
import { obterResumoCreditosMes } from "@/lib/services/creditos";
import { ConviteVendedorForm } from "@/components/convite-vendedor-form";
import { AlocacaoCreditoForm } from "@/components/alocacao-credito-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MeuPainelPage() {
  const ctx = await getSessionContext();

  const [vendedores, resumo, alocacoes] = await Promise.all([
    prisma.usuario.findMany({
      where: {
        contaId: ctx.contaId,
        papel: "VENDEDOR",
        ...(ctx.papel === "VENDEDOR" ? { id: ctx.userId } : {}),
      },
      orderBy: { criadoEm: "desc" },
    }),
    obterResumoCreditosMes(prisma, ctx.contaId),
    ctx.papel === "LOJISTA"
      ? prisma.creditAllocation.findMany({ where: { contaId: ctx.contaId } })
      : Promise.resolve([]),
  ]);
  const cotaPorUsuario = new Map(alocacoes.map((a) => [a.usuarioId, a.cotaAlocada]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Meu Painel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Créditos de busca (este mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Cota grátis: {resumo.cotaMensalGratis} — Consumido: {resumo.consumidoNoMes} —{" "}
            Restante: {resumo.restante}
          </p>
        </CardContent>
      </Card>

      {ctx.papel === "LOJISTA" && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ConviteVendedorForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vendedores ({vendedores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum vendedor cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {vendedores.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {v.nome} — {v.email} ({v.status})
                  </span>
                  {ctx.papel === "LOJISTA" && (
                    <AlocacaoCreditoForm
                      usuarioId={v.id}
                      nome={v.nome}
                      cotaAlocadaInicial={cotaPorUsuario.get(v.id) ?? 0}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
