"use client";

import { Button } from "@/components/ui/button";

export interface FiltrosAvancados {
  categoria?: string;
  subcategoria?: string[];
  tipoObra?: string[];
  tipoArea?: string[];
  zona?: string[];
  destinacao?: string[];
  tipoResponsavel?: string[];
  metragemFaixa?: string;
}

const SUBCATEGORIAS = ["OBRA_NOVA", "ACRESCIMO", "REFORMA", "DEMOLICAO", "EXISTENTE"];
const TIPOS_OBRA = ["ALVENARIA", "MISTA", "MADEIRA"];
const TIPOS_AREA = ["PRINCIPAL", "COMPLEMENTAR"];
const ZONAS = ["RURAL", "URBANA"];
const DESTINACOES = [
  "RESIDENCIAL_UNIFAMILIAR",
  "RESIDENCIAL_MULTIFAMILIAR",
  "COMERCIAL_SALAS_LOJAS",
  "EDIFICIO_GARAGENS",
  "GALPAO_INDUSTRIAL",
  "CASA_POPULAR",
  "CONJUNTO_HABITACIONAL_POPULAR",
];
const TIPOS_RESPONSAVEL = ["PESSOA_FISICA", "PESSOA_JURIDICA"];
const FAIXAS = [
  "ATE_100",
  "100_A_250",
  "250_A_500",
  "500_A_750",
  "750_A_1000",
  "1000_A_3000",
  "3000_A_20000",
  "ACIMA_DE_20000",
];

function MultiSelect({
  label,
  opcoes,
  selecionadas,
  onChange,
}: {
  label: string;
  opcoes: string[];
  selecionadas: string[];
  onChange: (valores: string[]) => void;
}) {
  function alternar(opcao: string) {
    onChange(
      selecionadas.includes(opcao)
        ? selecionadas.filter((v) => v !== opcao)
        : [...selecionadas, opcao]
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-1">
        {opcoes.map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => alternar(opcao)}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              selecionadas.includes(opcao)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-600"
            }`}
          >
            {opcao.replaceAll("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FiltrosAvancadosModal({
  aberto,
  filtros,
  onChange,
  onAplicar,
  onLimpar,
  onFechar,
}: {
  aberto: boolean;
  filtros: FiltrosAvancados;
  onChange: (filtros: FiltrosAvancados) => void;
  onAplicar: () => void;
  onLimpar: () => void;
  onFechar: () => void;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-black/20" onClick={onFechar}>
      <div
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Busca avançada</h2>

        <MultiSelect
          label="Subcategoria da obra"
          opcoes={SUBCATEGORIAS}
          selecionadas={filtros.subcategoria ?? []}
          onChange={(v) => onChange({ ...filtros, subcategoria: v })}
        />
        <MultiSelect
          label="Tipo de obra"
          opcoes={TIPOS_OBRA}
          selecionadas={filtros.tipoObra ?? []}
          onChange={(v) => onChange({ ...filtros, tipoObra: v })}
        />
        <MultiSelect
          label="Tipo de área"
          opcoes={TIPOS_AREA}
          selecionadas={filtros.tipoArea ?? []}
          onChange={(v) => onChange({ ...filtros, tipoArea: v })}
        />
        <MultiSelect
          label="Zona"
          opcoes={ZONAS}
          selecionadas={filtros.zona ?? []}
          onChange={(v) => onChange({ ...filtros, zona: v })}
        />
        <MultiSelect
          label="Destinação da obra"
          opcoes={DESTINACOES}
          selecionadas={filtros.destinacao ?? []}
          onChange={(v) => onChange({ ...filtros, destinacao: v })}
        />
        <MultiSelect
          label="Tipo de responsável"
          opcoes={TIPOS_RESPONSAVEL}
          selecionadas={filtros.tipoResponsavel ?? []}
          onChange={(v) => onChange({ ...filtros, tipoResponsavel: v })}
        />

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Metragem da obra</p>
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={filtros.metragemFaixa ?? ""}
            onChange={(e) => onChange({ ...filtros, metragemFaixa: e.target.value || undefined })}
          >
            <option value="">Selecione metragem obra</option>
            {FAIXAS.map((faixa) => (
              <option key={faixa} value={faixa}>
                {faixa.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onLimpar}>
            Limpar Filtros
          </Button>
          <Button type="button" onClick={onAplicar}>
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
