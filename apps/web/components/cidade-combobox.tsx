"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function CidadeCombobox({
  uf,
  value,
  onChange,
}: {
  uf: string;
  value: string;
  onChange: (cidade: string) => void;
}) {
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  useEffect(() => {
    if (!uf) {
      setOpcoes([]);
      return;
    }
    let cancelado = false;
    fetch(`/api/ibge/municipios?uf=${uf}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((dados: { nome: string }[]) => {
        if (!cancelado) setOpcoes(dados.map((d) => d.nome));
      })
      .catch(() => {
        if (!cancelado) setOpcoes([]);
      });
    return () => {
      cancelado = true;
    };
  }, [uf]);

  const filtradas = value
    ? opcoes.filter((nome) => nome.toLowerCase().includes(value.toLowerCase()))
    : opcoes;

  return (
    <div className="relative">
      <Input
        value={value}
        disabled={!uf}
        placeholder={uf ? "Digite para buscar" : "Selecione a UF primeiro"}
        onChange={(e) => {
          onChange(e.target.value);
          setMostrarLista(true);
        }}
        onFocus={() => setMostrarLista(true)}
        onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
      />
      {mostrarLista && filtradas.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtradas.slice(0, 50).map((nome) => (
            <li
              key={nome}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-slate-100"
              onMouseDown={() => onChange(nome)}
            >
              {nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
