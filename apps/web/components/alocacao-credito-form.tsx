"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AlocacaoCreditoForm({
  usuarioId,
  cotaAlocadaInicial,
}: {
  usuarioId: string;
  cotaAlocadaInicial: number;
}) {
  const [cota, setCota] = useState(cotaAlocadaInicial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState(false);

  async function salvar() {
    setSalvando(true);
    setSalvo(false);
    setErro(false);
    try {
      const res = await fetch("/api/creditos/alocacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, cotaAlocada: cota }),
      });
      if (res.ok) {
        setSalvo(true);
      } else {
        setErro(true);
      }
    } catch {
      setErro(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={cota}
        onChange={(e) => setCota(Number(e.target.value))}
        className="w-24"
      />
      <Button type="button" size="sm" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar cota"}
      </Button>
      {salvo && (
        <span role="status" className="text-xs text-green-600">
          Salvo
        </span>
      )}
      {erro && (
        <span role="alert" className="text-xs text-red-600">
          Erro ao salvar
        </span>
      )}
    </div>
  );
}
