const CUSTO_M2_CENTAVOS = 225_400; // R$ 2.254,00/m² — constante observada no sistema real
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
  resultado.setUTCMonth(resultado.getUTCMonth() + Math.round(mesesEstimados));
  return resultado;
}
