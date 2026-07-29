import { describe, expect, it } from "vitest";
import { mesReferenciaAnterior } from "../../lib/mes-referencia";

describe("mesReferenciaAnterior", () => {
  it("retorna o mes anterior em meados do ano", () => {
    expect(mesReferenciaAnterior(new Date("2026-07-15T12:00:00.000Z"))).toBe("2026-06");
  });

  it("vira o ano em janeiro", () => {
    expect(mesReferenciaAnterior(new Date("2026-01-10T00:00:00.000Z"))).toBe("2025-12");
  });

  it("zero-preenche meses de um digito", () => {
    expect(mesReferenciaAnterior(new Date("2026-11-05T00:00:00.000Z"))).toBe("2026-10");
  });
});
