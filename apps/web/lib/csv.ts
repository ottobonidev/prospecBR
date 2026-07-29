export interface ObraParaCsv {
  cno: string;
  razaoSocial: string;
  uf: string;
  cidade: string;
  status: string;
  dataInicio: Date | null;
}

const CABECALHO = "cno,razaoSocial,uf,cidade,status,dataInicio";

function escaparCampo(valor: string): string {
  return valor.includes(",") ? `"${valor}"` : valor;
}

export function obrasParaCsv(obras: ObraParaCsv[]): string {
  const linhas = obras.map((obra) => {
    const dataInicio = obra.dataInicio ? obra.dataInicio.toISOString().slice(0, 10) : "";
    return [
      obra.cno,
      escaparCampo(obra.razaoSocial),
      obra.uf,
      obra.cidade,
      obra.status,
      dataInicio,
    ].join(",");
  });

  return [CABECALHO, ...linhas].join("\n");
}
