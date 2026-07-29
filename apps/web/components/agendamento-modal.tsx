"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AgendamentoValor {
  data: string;
  hora: string;
  titulo: string;
  descricao: string;
}

const VAZIO: AgendamentoValor = { data: "", hora: "", titulo: "", descricao: "" };

export function AgendamentoModal({
  aberto,
  onCriar,
  onFechar,
}: {
  aberto: boolean;
  onCriar: (valor: AgendamentoValor) => void;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState<AgendamentoValor>(VAZIO);

  useEffect(() => {
    if (aberto) setValor(VAZIO);
  }, [aberto]);

  if (!aberto) return null;

  const podeSalvar = valor.data && valor.hora && valor.titulo.trim();

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-black/20" onClick={onFechar}>
      <div
        className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Novo agendamento</h2>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="agend-data">Data</Label>
            <Input
              id="agend-data"
              type="date"
              value={valor.data}
              onChange={(e) => setValor({ ...valor, data: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="agend-hora">Hora</Label>
            <Input
              id="agend-hora"
              type="time"
              value={valor.hora}
              onChange={(e) => setValor({ ...valor, hora: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="agend-titulo">Título</Label>
          <Input
            id="agend-titulo"
            value={valor.titulo}
            onChange={(e) => setValor({ ...valor, titulo: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Descrição</p>
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 p-2 text-sm"
            value={valor.descricao}
            onChange={(e) => setValor({ ...valor, descricao: e.target.value })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="button" disabled={!podeSalvar} onClick={() => onCriar(valor)}>
            Criar Agendamento
          </Button>
        </div>
      </div>
    </div>
  );
}
