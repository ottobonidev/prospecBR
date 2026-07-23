"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface AcompanhamentoValor {
  status: string;
  temperatura: string | null;
  probabilidade: number | null;
  anotacoes: string | null;
}

const STATUS = [
  "SELECAO",
  "CONTATO",
  "NAO_RESPONDEU",
  "RESPONDEU",
  "ORCAMENTO",
  "A_FECHAR",
  "FECHADO",
  "PERDIDO",
  "JA_COMPROU",
  "NAO_QUER_RECEBER_MENSAGEM",
  "OUTROS",
];
const TEMPERATURAS = ["MUITO_QUENTE", "QUENTE", "MORNA", "FRIA"];
const PROBABILIDADES = [0, 25, 50, 75, 90];

const VAZIO: AcompanhamentoValor = {
  status: "SELECAO",
  temperatura: null,
  probabilidade: null,
  anotacoes: null,
};

export function AcompanhamentoModal({
  aberto,
  inicial,
  onSalvar,
  onFechar,
}: {
  aberto: boolean;
  inicial: AcompanhamentoValor | null;
  onSalvar: (valor: AcompanhamentoValor) => void;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState<AcompanhamentoValor>(VAZIO);

  useEffect(() => {
    if (aberto) setValor(inicial ?? VAZIO);
  }, [aberto, inicial]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-black/20" onClick={onFechar}>
      <div
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Acompanhamento</h2>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Anotações</p>
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
            value={valor.anotacoes ?? ""}
            onChange={(e) => setValor({ ...valor, anotacoes: e.target.value || null })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Status</p>
          <div className="flex flex-wrap gap-1">
            {STATUS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValor({ ...valor, status: s })}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.status === s
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {s.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Temperatura</p>
          <div className="flex flex-wrap gap-1">
            {TEMPERATURAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setValor({ ...valor, temperatura: valor.temperatura === t ? null : t })
                }
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.temperatura === t
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {t.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Probabilidade</p>
          <div className="flex flex-wrap gap-1">
            {PROBABILIDADES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setValor({ ...valor, probabilidade: valor.probabilidade === p ? null : p })
                }
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  valor.probabilidade === p
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onSalvar(valor)}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
