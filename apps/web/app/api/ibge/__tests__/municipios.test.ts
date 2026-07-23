import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, __resetCacheParaTeste } from "../municipios/route";

describe("GET /api/ibge/municipios", () => {
  beforeEach(() => {
    __resetCacheParaTeste();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when uf is missing", async () => {
    const res = await GET(new Request("http://localhost/api/ibge/municipios"));
    expect(res.status).toBe(400);
  });

  it("proxies the IBGE API and returns a reduced shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, nome: "Curitiba", microrregiao: {} },
        { id: 2, nome: "Maringá", microrregiao: {} },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(new Request("http://localhost/api/ibge/municipios?uf=PR"));
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados/PR/municipios"
    );
    expect(body).toEqual([{ nome: "Curitiba" }, { nome: "Maringá" }]);
  });

  it("caches the result per UF and does not call fetch again within the cache window", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, nome: "Curitiba" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await GET(new Request("http://localhost/api/ibge/municipios?uf=PR"));
    await GET(new Request("http://localhost/api/ibge/municipios?uf=PR"));

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns 502 when the upstream IBGE call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const res = await GET(new Request("http://localhost/api/ibge/municipios?uf=XX"));
    expect(res.status).toBe(502);
  });
});
