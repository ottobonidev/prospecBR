import type { ReactNode } from "react";

export interface ObraResumo {
  id: string;
  cno: string;
  razaoSocial: string;
  responsavelNome: string | null;
  uf: string;
  cidade: string;
  bairro: string | null;
  status: string;
  subcategoria: string | null;
  tipoObra: string | null;
  tipoArea: string | null;
  destinacao: string | null;
  areaConstruida: number | null;
  areaTotal: number | null;
  valorInvestimentoCentavos: number | null;
  dataInicio: string | null;
  previsaoTermino: string | null;
  enderecoCompleto: string | null;
  complemento: string | null;
}

interface ObraCardProps {
  obra: ObraResumo;
  children?: ReactNode;
}

function formatarMoeda(centavos: number | null): string {
  if (centavos === null) return "-";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ObraCard({ obra, children }: ObraCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <p className="font-semibold text-slate-900">
          {obra.cno} | {obra.uf} - {obra.cidade}
        </p>
        {children && <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>}
      </div>

      <p className="mb-2 text-slate-700">
        <strong>Proprietario:</strong> {obra.razaoSocial}
        {obra.responsavelNome && obra.responsavelNome !== obra.razaoSocial && (
          <span className="ml-4">
            <strong>Responsavel:</strong> {obra.responsavelNome}
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600 sm:grid-cols-4">
        <span>
          <strong>Subcategoria:</strong> {obra.subcategoria ?? "-"}
        </span>
        <span>
          <strong>Tipo:</strong> {obra.tipoObra ?? "-"}
        </span>
        <span>
          <strong>Situacao:</strong> {obra.status}
        </span>
        <span>
          <strong>Tipo de area:</strong> {obra.tipoArea ?? "-"}
        </span>
        <span>
          <strong>Valor Investimento:</strong> {formatarMoeda(obra.valorInvestimentoCentavos)}
        </span>
        <span>
          <strong>Metragem:</strong> {obra.areaConstruida ?? "-"} m2
        </span>
        <span>
          <strong>Area total:</strong> {obra.areaTotal ?? obra.areaConstruida ?? "-"} m2
        </span>
        <span>
          <strong>Destinacao:</strong> {obra.destinacao ?? "-"}
        </span>
        <span>
          <strong>Data de inicio:</strong> {formatarData(obra.dataInicio)}
        </span>
        <span>
          <strong>Previsao de termino:</strong> {formatarData(obra.previsaoTermino)}
        </span>
      </div>

      {obra.enderecoCompleto && (
        <p className="mt-2 text-slate-500">
          <strong>Endereco:</strong> {obra.enderecoCompleto}
          {obra.complemento && <span> - Complemento: {obra.complemento}</span>}
        </p>
      )}
    </article>
  );
}
