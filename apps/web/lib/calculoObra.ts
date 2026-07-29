// Constantes medidas por amostragem no sistema de referência (walkthrough de produção em
// 2026-07-22, docs/superpowers/specs/2026-07-22-conectaobras-sistema-real.md) — não vêm de
// nenhuma fórmula ou fonte oficial, o CNO não informa valor de investimento nem previsão de
// término. Não "corrigir" sem reamostrar o sistema real.
const CUSTO_M2_CENTAVOS = 225_400; // R$ 2.254,00/m²
const PRAZO_MINIMO_MESES = 6;
const PRAZO_MAXIMO_MESES = 36;
const AREA_POR_MES = 50;

export function calcularValorInvestimentoCentavos(areaConstruida: number): number {
  return Math.round(areaConstruida * CUSTO_M2_CENTAVOS);
}

function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

export function calcularPrevisaoTermino(dataInicio: Date, areaConstruida: number): Date {
  const mesesEstimados = clamp(areaConstruida / AREA_POR_MES, PRAZO_MINIMO_MESES, PRAZO_MAXIMO_MESES);
  const resultado = new Date(dataInicio);
  // Arredonda o mês pra cima em empates (ex.: 6,5 meses -> 7) — é uma estimativa exibida ao
  // usuário, não um prazo contratual, então o viés de meio mês a mais é aceitável.
  resultado.setUTCMonth(resultado.getUTCMonth() + Math.round(mesesEstimados));
  return resultado;
}
