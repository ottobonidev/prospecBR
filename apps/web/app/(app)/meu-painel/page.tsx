import { prisma } from "@conecta-obras/db";
import { getSessionContext } from "@/lib/session";
import { ConviteVendedorForm } from "@/components/convite-vendedor-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MeuPainelPage() {
  const ctx = await getSessionContext();

  const vendedores = await prisma.usuario.findMany({
    where: { contaId: ctx.contaId, papel: "VENDEDOR" },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Meu Painel</h1>

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
                <li key={v.id} className="py-2 text-sm">
                  {v.nome} — {v.email} ({v.status})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
