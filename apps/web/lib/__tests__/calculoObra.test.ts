import { describe, it, expect } from "vitest";
import { calcularValorInvestimentoCentavos, calcularPrevisaoTermino } from "../calculoObra";

describe("calcularValorInvestimentoCentavos", () => {
  it("multiplies area by the fixed R$2.254,00/m² rate", () => {
    expect(calcularValorInvestimentoCentavos(285.92)).toBe(Math.round(285.92 * 225400));
  });

  it("returns 0 for zero area", () => {
    expect(calcularValorInvestimentoCentavos(0)).toBe(0);
  });
});

describe("calcularPrevisaoTermino", () => {
  it("adds a term proportional to area (area/50 months), for a mid-size obra", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const resultado = calcularPrevisaoTermino(inicio, 500); // 500/50 = 10 months
    expect(resultado).toEqual(new Date("2026-11-15T00:00:00.000Z"));
  });

  it("clamps the term at a minimum of 6 months for small obras", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const resultado = calcularPrevisaoTermino(inicio, 10); // 10/50 = 0.2 months -> clamp to 6
    expect(resultado).toEqual(new Date("2026-07-15T00:00:00.000Z"));
  });

  it("clamps the term at a maximum of 36 months for huge obras", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const resultado = calcularPrevisaoTermino(inicio, 5000); // 5000/50 = 100 months -> clamp to 36
    expect(resultado).toEqual(new Date("2029-01-15T00:00:00.000Z"));
  });

  it("rounds a non-integer in-range month count up on a .5 tie", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const resultado = calcularPrevisaoTermino(inicio, 325); // 325/50 = 6.5 months -> rounds to 7
    expect(resultado).toEqual(new Date("2026-08-15T00:00:00.000Z"));
  });
});
