"use client";

import { useState } from "react";
import { Calendar, Heart, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obrasParaCsv } from "@/lib/csv";
import { CidadeCombobox } from "@/components/cidade-combobox";
import { FiltrosAvancadosModal, type FiltrosAvancados } from "@/components/filtros-avancados-modal";
import { AcompanhamentoModal, type AcompanhamentoValor } from "@/components/acompanhamento-modal";
import { AgendamentoModal, type AgendamentoValor } from "@/components/agendamento-modal";
import { ObraCard, type ObraResumo } from "@/components/obra-card";

const PAGE_SIZE = 10;

export function LeadsSearchForm({ restanteInicial }: { restanteInicial: number }) {
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [filtros, setFiltros] = useState<FiltrosAvancados>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [restante, setRestante] = useState(restanteInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excedente, setExcedente] = useState(false);
  const [acompanharObraId, setAcompanharObraId] = useState<string | null>(null);
  const [acompInicial, setAcompInicial] = useState<AcompanhamentoValor | null>(null);
  const [agendarObraId, setAgendarObraId] = useState<string | null>(null);
  const [statusPorObra, setStatusPorObra] = useState<
    Record<string, { status: string; temperatura: string | null }>
  >({});

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

  async function abrirAcompanhar(obraId: string) {
    setAcompInicial(null);
    setAcompanharObraId(obraId);
    try {
      const res = await fetch(`/api/leads/acompanhar?obraId=${obraId}`);
      if (res.ok) {
        const dados = await res.json();
        if (dados) {
          setAcompInicial({
            status: dados.status,
            temperatura: dados.temperatura ?? null,
            probabilidade: dados.probabilidade ?? null,
            anotacoes: dados.anotacoes ?? null,
          });
        }
      }
    } catch {
      // mantém o modal com valores padrão se a busca falhar
    }
  }

  async function salvarAcompanhamento(valor: AcompanhamentoValor) {
    const obraId = acompanharObraId;
    if (!obraId) return;
    const res = await fetch("/api/leads/acompanhar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obraId, ...valor }),
    });
    if (res.ok) {
      setStatusPorObra((atual) => ({
        ...atual,
        [obraId]: { status: valor.status, temperatura: valor.temperatura },
      }));
    }
    setAcompanharObraId(null);
  }

  async function criarAgendamento(valor: AgendamentoValor) {
    const obraId = agendarObraId;
    if (!obraId) return;
    await fetch("/api/leads/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obraId,
        dataHora: new Date(`${valor.data}T${valor.hora}`).toISOString(),
        titulo: valor.titulo,
        descricao: valor.descricao || null,
      }),
    });
    setAgendarObraId(null);
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

      <AcompanhamentoModal
        aberto={acompanharObraId !== null}
        inicial={acompInicial}
        onSalvar={salvarAcompanhamento}
        onFechar={() => setAcompanharObraId(null)}
      />

      <AgendamentoModal
        aberto={agendarObraId !== null}
        onCriar={criarAgendamento}
        onFechar={() => setAgendarObraId(null)}
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
              <li key={obra.id}>
                <ObraCard obra={obra}>
                  {statusPorObra[obra.id] && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {statusPorObra[obra.id].status.replaceAll("_", " ")}
                      {statusPorObra[obra.id].temperatura && (
                        <span className="ml-1 font-normal text-slate-500">
                          {statusPorObra[obra.id].temperatura!.replaceAll("_", " ")}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="flex gap-1 text-slate-500">
                    <button
                      type="button"
                      title="Agendar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                      onClick={() => setAgendarObraId(obra.id)}
                    >
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Favoritar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                      onClick={() => favoritar(obra.id)}
                    >
                      <Heart className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Acompanhar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                      onClick={() => abrirAcompanhar(obra.id)}
                    >
                      <Tag className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Ocultar"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
                      onClick={() => ocultar(obra.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                </ObraCard>
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
