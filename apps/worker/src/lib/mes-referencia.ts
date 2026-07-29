/**
 * Retorna o mes anterior ao de `hoje` no formato "YYYY-MM" (UTC).
 * Ex.: rodando em 2026-07-01, retorna "2026-06".
 */
export function mesReferenciaAnterior(hoje: Date = new Date()): string {
  const anoMesAnterior = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const ano = anoMesAnterior.getUTCFullYear();
  const mes = String(anoMesAnterior.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}
