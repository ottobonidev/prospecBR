import { signOut } from "@/auth";
import { NavItem } from "@/components/nav-item";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", disabled: false },
  { label: "Leads", href: "/leads", disabled: false },
  { label: "CRM", href: "/crm", disabled: false },
  { label: "SDR IA", href: "/sdr-ia", disabled: true },
  { label: "Consulta Plus", href: "/consulta-plus", disabled: true },
  { label: "Busca Avançada", href: "/busca-avancada", disabled: true },
  { label: "Conecta I.A.", href: "/conecta-ia", disabled: true },
  { label: "Meu Painel", href: "/meu-painel", disabled: false },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-4 text-lg font-bold text-slate-900">Conecta Obras</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{userName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
