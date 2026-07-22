"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { obrasParaCsv } from "@/lib/csv";

interface Obra {
  id: string;
  cno: string;
  razaoSocial: string;
  uf: string;
  cidade: string;
  bairro: string | null;
  status: string;
  dataInicio: string | null;
}

export function LeadsSearchForm({ restanteInicial }: { restanteInicial: number }) {
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [restante, setRestante] = useState(restanteInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excedente, setExcedente] = useState(false);

  async function pesquisar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const params = new URLSearchParams();
    if (uf.trim()) {
      uf
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean)
        .forEach((v) => params.append("uf", v));
    }
    if (cidade.trim()) params.set("cidade", cidade.trim());
    if (palavraChave.trim()) params.set("palavraChave", palavraChave.trim());

    try {
      const res = await fetch(`/api/leads/search?${params.toString()}`);
      if (!res.ok) {
        setErro("Não foi possível buscar obras agora.");
        setObras([]);
        setTotal(null);
        return;
      }
      const body = await res.json();
      setObras(body.items);
      setTotal(body.total);
      setExcedente(Boolean(body.excedente));
      setRestante((atual) => (body.excedente ? atual : Math.max(0, atual - 1)));
    } catch {
      setErro("Não foi possível buscar obras agora.");
      setObras([]);
      setTotal(null);
    } finally {
      setCarregando(false);
    }
  }

  function exportarCsv() {
    const csv = obrasParaCsv(
      obras.map((obra) => ({
        ...obra,
        dataInicio: obra.dataInicio ? new Date(obra.dataInicio) : null,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "obras.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={pesquisar} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="uf">UF (separe por vírgula)</Label>
          <Input id="uf" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="PR, SC" />
        </div>
        <div>
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="palavraChave">Palavra-chave</Label>
          <Input
            id="palavraChave"
            value={palavraChave}
            onChange={(e) => setPalavraChave(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={carregando}>
          {carregando ? "Buscando..." : "Pesquisar"}
        </Button>
        {obras.length > 0 && (
          <Button type="button" variant="outline" onClick={exportarCsv}>
            Exportar CSV
          </Button>
        )}
      </form>

      <p className="text-sm text-slate-600">
        Buscas grátis restantes este mês: {restante}
        {excedente && (
          <span className="ml-2 text-amber-700">
            Franquia esgotada — buscas adicionais são cobradas como excedente.
          </span>
        )}
      </p>

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}

      {total !== null && (
        <div className="space-y-2">
          <p aria-live="polite" className="text-sm text-slate-500">
            {total} obra(s) encontrada(s)
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {obras.map((obra) => (
              <li key={obra.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{obra.razaoSocial}</p>
                  <p className="text-slate-500">
                    {obra.bairro ? `${obra.bairro}, ` : ""}
                    {obra.cidade} - {obra.uf}
                  </p>
                </div>
                <Badge>{obra.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
