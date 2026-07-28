"use client";

import { useMemo, useState } from "react";
import { ObraCard, type ObraResumo } from "@/components/obra-card";
import { Button } from "@/components/ui/button";

type AbaCrm = "favoritos" | "acompanhamentos" | "agenda" | "excluidos";

interface FavoritoCrm {
  id: string;
  criadoEm: string;
  obra: ObraResumo;
}

interface OcultaCrm {
  id: string;
  criadoEm: string;
  obra: ObraResumo;
}

interface AcompanhamentoCrm {
  id: string;
  status: string;
  temperatura: string | null;
  probabilidade: number | null;
  anotacoes: string | null;
  criadoEm: string;
  obra: ObraResumo;
}

interface AgendamentoCrm {
  id: string;
  dataHora: string;
  titulo: string;
  descricao: string | null;
  criadoEm: string;
  obra: ObraResumo;
}

interface CrmTabsProps {
  favoritos: FavoritoCrm[];
  acompanhamentos: AcompanhamentoCrm[];
  agendamentos: AgendamentoCrm[];
  ocultas: OcultaCrm[];
}

const ABAS: Array<{ id: AbaCrm; label: string }> = [
  { id: "favoritos", label: "Favoritos" },
  { id: "acompanhamentos", label: "Acompanhamentos" },
  { id: "agenda", label: "Agenda" },
  { id: "excluidos", label: "Excluidos" },
];

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

function formatarEnum(valor: string) {
  return valor.replaceAll("_", " ");
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ListaVazia() {
  return (
    <li className="rounded border border-dashed border-slate-200 p-6 text-sm text-slate-500">
      Nenhum item nesta aba.
    </li>
  );
}

export function CrmTabs({ favoritos, acompanhamentos, agendamentos, ocultas }: CrmTabsProps) {
  const [aba, setAba] = useState<AbaCrm>("favoritos");
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);

  const acompanhamentosFiltrados = useMemo(() => {
    if (!statusFiltro) return acompanhamentos;
    return acompanhamentos.filter((item) => item.status === statusFiltro);
  }, [acompanhamentos, statusFiltro]);

  const contagens: Record<AbaCrm, number> = {
    favoritos: favoritos.length,
    acompanhamentos: acompanhamentos.length,
    agenda: agendamentos.length,
    excluidos: ocultas.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {ABAS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={aba === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => setAba(item.id)}
          >
            {item.label} ({contagens[item.id]})
          </Button>
        ))}
      </div>

      {aba === "favoritos" && (
        <ul className="space-y-3">
          {favoritos.length === 0 ? (
            <ListaVazia />
          ) : (
            favoritos.map((item) => (
              <li key={item.id}>
                <ObraCard obra={item.obra} />
              </li>
            ))
          )}
        </ul>
      )}

      {aba === "acompanhamentos" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={statusFiltro === null ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFiltro(null)}
            >
              Todos
            </Button>
            {STATUS.map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFiltro === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFiltro(status)}
              >
                {formatarEnum(status)}
              </Button>
            ))}
          </div>

          <ul className="space-y-3">
            {acompanhamentosFiltrados.length === 0 ? (
              <ListaVazia />
            ) : (
              acompanhamentosFiltrados.map((item) => (
                <li key={item.id}>
                  <ObraCard obra={item.obra}>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {formatarEnum(item.status)}
                    </span>
                    {item.temperatura && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {formatarEnum(item.temperatura)}
                      </span>
                    )}
                    {item.probabilidade !== null && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {item.probabilidade}%
                      </span>
                    )}
                  </ObraCard>
                  {item.anotacoes && (
                    <p className="mt-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      {item.anotacoes}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {aba === "agenda" && (
        <ul className="space-y-3">
          {agendamentos.length === 0 ? (
            <ListaVazia />
          ) : (
            agendamentos.map((item) => (
              <li key={item.id}>
                <ObraCard obra={item.obra}>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {formatarDataHora(item.dataHora)}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {item.titulo}
                  </span>
                </ObraCard>
                {item.descricao && (
                  <p className="mt-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    {item.descricao}
                  </p>
                )}
              </li>
            ))
          )}
        </ul>
      )}

      {aba === "excluidos" && (
        <ul className="space-y-3">
          {ocultas.length === 0 ? (
            <ListaVazia />
          ) : (
            ocultas.map((item) => (
              <li key={item.id}>
                <ObraCard obra={item.obra} />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
