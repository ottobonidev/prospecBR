"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AlocacaoCreditoForm({
  usuarioId,
  nome,
  cotaAlocadaInicial,
}: {
  usuarioId: string;
  nome: string;
  cotaAlocadaInicial: number;
}) {
  const [cota, setCota] = useState(String(cotaAlocadaInicial));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState(false);

  const cotaNumero = Number(cota);
  const cotaValida = cota.trim() !== "" && Number.isInteger(cotaNumero) && cotaNumero >= 0;

  async function salvar() {
    if (!cotaValida) {
      setErro(true);
      return;
    }
    setSalvando(true);
    setSalvo(false);
    setErro(false);
    try {
      const res = await fetch("/api/creditos/alocacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, cotaAlocada: cotaNumero }),
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
        aria-label={`Cota alocada para ${nome}`}
        value={cota}
        onChange={(e) => {
          setCota(e.target.value);
          setSalvo(false);
          setErro(false);
        }}
        className="w-24"
      />
      <Button type="button" size="sm" onClick={salvar} disabled={salvando || !cotaValida}>
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
