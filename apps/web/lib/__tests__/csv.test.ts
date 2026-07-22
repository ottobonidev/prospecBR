import { describe, it, expect } from "vitest";
import { obrasParaCsv } from "../csv";

describe("obrasParaCsv", () => {
  it("returns header only for an empty list", () => {
    expect(obrasParaCsv([])).toBe("cno,razaoSocial,uf,cidade,status,dataInicio");
  });

  it("renders one row per obra, quoting fields with commas", () => {
    const csv = obrasParaCsv([
      {
        cno: "12.345.678/0001-90",
        razaoSocial: "Construtora Silva, Ltda",
        uf: "PR",
        cidade: "Curitiba",
        status: "ATIVA",
        dataInicio: new Date("2026-01-15T00:00:00.000Z"),
      },
    ]);

    const linhas = csv.split("\n");
    expect(linhas[0]).toBe("cno,razaoSocial,uf,cidade,status,dataInicio");
    expect(linhas[1]).toBe(
      '12.345.678/0001-90,"Construtora Silva, Ltda",PR,Curitiba,ATIVA,2026-01-15'
    );
  });

  it("renders an empty dataInicio as an empty field", () => {
    const csv = obrasParaCsv([
      {
        cno: "111",
        razaoSocial: "Obra sem data",
        uf: "SC",
        cidade: "Joinville",
        status: "SUSPENSA",
        dataInicio: null,
      },
    ]);

    expect(csv.split("\n")[1]).toBe("111,Obra sem data,SC,Joinville,SUSPENSA,");
  });
});
