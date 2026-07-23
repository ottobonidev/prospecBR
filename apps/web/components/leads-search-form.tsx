"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obrasParaCsv } from "@/lib/csv";
import { CidadeCombobox } from "@/components/cidade-combobox";
import { FiltrosAvancadosModal, type FiltrosAvancados } from "@/components/filtros-avancados-modal";

interface Obra {
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

const PAGE_SIZE = 10;

function formatarMoeda(centavos: number | null): string {
  if (centavos === null) return "-";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function LeadsSearchForm({ restanteInicial }: { restanteInicial: number }) {
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [filtros, setFiltros] = useState<FiltrosAvancados>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [obras, setObras] = useState<Obra[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [restante, setRestante] = useState(restanteInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excedente, setExcedente] = useState(false);

  function montarParametros(paginaAlvo: number) {
    const params = new URLSearchParams();
    uf
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean)
      .forEach((v) => params.append("uf", v));
    if (cidade.trim()) params.set("cidade", cidade.trim());
    if (palavraChave.trim()) params.set("palavraChave", palavraChave.trim());
    if (filtros.categoria) params.set("categoria", filtros.categoria);
    if (filtros.metragemFaixa) params.set("metragemFaixa", filtros.metragemFaixa);
    (filtros.subcategoria ?? []).forEach((v) => params.append("subcategoria", v));
    (filtros.tipoObra ?? []).forEach((v) => params.append("tipoObra", v));
    (filtros.tipoArea ?? []).forEach((v) => params.append("tipoArea", v));
    (filtros.zona ?? []).forEach((v) => params.append("zona", v));
    (filtros.destinacao ?? []).forEach((v) => params.append("destinacao", v));
    (filtros.tipoResponsavel ?? []).forEach((v) => params.append("tipoResponsavel", v));
    params.set("page", String(paginaAlvo));
    return params;
  }

  async function buscarPagina(paginaAlvo: number) {
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch(`/api/leads/search?${montarParametros(paginaAlvo).toString()}`);
      if (!res.ok) {
        setErro("Não foi possível buscar obras agora.");
        setObras([]);
        setTotal(null);
        return;
      }
      const body = await res.json();
      setObras(body.items);
      setTotal(body.total);
      setPagina(paginaAlvo);
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

  async function pesquisar(e: React.FormEvent) {
    e.preventDefault();
    await buscarPagina(1);
  }

  async function favoritar(obraId: string) {
    await fetch("/api/leads/favoritar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obraId }),
    });
  }

  async function ocultar(obraId: string) {
    const res = await fetch("/api/leads/ocultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obraId }),
    });
    if (res.ok) {
      setObras((atual) => atual.filter((o) => o.id !== obraId));
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

  const totalPaginas = total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <form onSubmit={pesquisar} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="uf">UF (separe por vírgula)</Label>
          <Input id="uf" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="PR, SC" />
        </div>
        <div>
          <Label htmlFor="cidade">Cidade</Label>
          <CidadeCombobox
            uf={uf.split(",")[0]?.trim().toUpperCase() ?? ""}
            value={cidade}
            onChange={setCidade}
          />
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
        <Button type="button" variant="outline" onClick={() => setModalAberto(true)}>
          Busca Avançada
        </Button>
        {obras.length > 0 && (
          <Button type="button" variant="outline" onClick={exportarCsv}>
            Exportar CSV
          </Button>
        )}
      </form>

      <FiltrosAvancadosModal
        aberto={modalAberto}
        filtros={filtros}
        onChange={setFiltros}
        onLimpar={() => setFiltros({})}
        onAplicar={() => {
          setModalAberto(false);
          buscarPagina(1);
        }}
        onFechar={() => setModalAberto(false)}
      />

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
        <div className="space-y-3">
          <p aria-live="polite" className="text-sm text-slate-500">
            {total} obra(s) encontrada(s)
          </p>

          <ul className="space-y-3">
            {obras.map((obra) => (
              <li key={obra.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">
                    {obra.cno} | {obra.uf} - {obra.cidade}
                  </p>
                  <div className="flex gap-2 text-slate-400">
                    <button
                      type="button"
                      title="Disponível no CRM"
                      disabled
                      className="cursor-not-allowed"
                    >
                      📅
                    </button>
                    <button type="button" title="Favoritar" onClick={() => favoritar(obra.id)}>
                      ♡
                    </button>
                    <button
                      type="button"
                      title="Disponível no CRM"
                      disabled
                      className="cursor-not-allowed"
                    >
                      🏷
                    </button>
                    <button type="button" title="Ocultar" onClick={() => ocultar(obra.id)}>
                      🗑
                    </button>
                  </div>
                </div>

                <p className="mb-2 text-slate-700">
                  <strong>Proprietário:</strong> {obra.razaoSocial}
                  {obra.responsavelNome && obra.responsavelNome !== obra.razaoSocial && (
                    <span className="ml-4">
                      <strong>Responsável:</strong> {obra.responsavelNome}
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
                    <strong>Situação:</strong> {obra.status}
                  </span>
                  <span>
                    <strong>Tipo de área:</strong> {obra.tipoArea ?? "-"}
                  </span>
                  <span>
                    <strong>Valor Investimento:</strong>{" "}
                    {formatarMoeda(obra.valorInvestimentoCentavos)}
                  </span>
                  <span>
                    <strong>Metragem:</strong> {obra.areaConstruida ?? "-"} m2
                  </span>
                  <span>
                    <strong>Área total:</strong> {obra.areaTotal ?? obra.areaConstruida ?? "-"} m2
                  </span>
                  <span>
                    <strong>Destinação:</strong> {obra.destinacao ?? "-"}
                  </span>
                  <span>
                    <strong>Data de início:</strong> {formatarData(obra.dataInicio)}
                  </span>
                  <span>
                    <strong>Previsão de término:</strong> {formatarData(obra.previsaoTermino)}
                  </span>
                </div>

                {obra.enderecoCompleto && (
                  <p className="mt-2 text-slate-500">
                    <strong>Endereço:</strong> {obra.enderecoCompleto}
                    {obra.complemento && <span> — Complemento: {obra.complemento}</span>}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina <= 1 || carregando}
                onClick={() => buscarPagina(pagina - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Página {pagina} de {totalPaginas}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas || carregando}
                onClick={() => buscarPagina(pagina + 1)}
              >
                Próximo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
