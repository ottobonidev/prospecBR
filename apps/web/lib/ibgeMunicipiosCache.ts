export interface EntradaCache {
  municipios: { nome: string }[];
  expiraEm: number;
}

let cachePorUf = new Map<string, EntradaCache>();

export function obterCache(uf: string): EntradaCache | undefined {
  return cachePorUf.get(uf);
}

export function definirCache(uf: string, entrada: EntradaCache): void {
  cachePorUf.set(uf, entrada);
}

export function __resetCacheParaTeste(): void {
  cachePorUf = new Map();
}
