import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NavItemProps {
  label: string;
  href: string;
  disabled?: boolean;
}

export function NavItem({ label, href, disabled }: NavItemProps) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400"
      >
        {label}
        <Badge>em breve</Badge>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      )}
    >
      {label}
    </Link>
  );
}
