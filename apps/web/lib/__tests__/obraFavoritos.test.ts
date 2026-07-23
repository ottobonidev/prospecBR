import { describe, it, expect, vi } from "vitest";
import { alternarFavorito, ocultarObra } from "../services/obraFavoritos";

describe("alternarFavorito", () => {
  it("creates a favorito when none exists", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "fav_1" });
    const deleteFn = vi.fn();
    const prisma = { obraFavorito: { findFirst, create, delete: deleteFn } } as any;

    const resultado = await alternarFavorito(prisma, {
      usuarioId: "user_1",
      obraId: "obra_1",
    });

    expect(create).toHaveBeenCalledWith({
      data: { usuarioId: "user_1", obraId: "obra_1" },
    });
    expect(deleteFn).not.toHaveBeenCalled();
    expect(resultado).toEqual({ favoritado: true });
  });

  it("removes an existing favorito (toggle off)", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "fav_1" });
    const create = vi.fn();
    const deleteFn = vi.fn().mockResolvedValue({ id: "fav_1" });
    const prisma = { obraFavorito: { findFirst, create, delete: deleteFn } } as any;

    const resultado = await alternarFavorito(prisma, {
      usuarioId: "user_1",
      obraId: "obra_1",
    });

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "fav_1" } });
    expect(create).not.toHaveBeenCalled();
    expect(resultado).toEqual({ favoritado: false });
  });
});

describe("ocultarObra", () => {
  it("creates an ObraOculta row for the given usuario, ignoring duplicates", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "oculta_1" });
    const prisma = { obraOculta: { upsert } } as any;

    await ocultarObra(prisma, { usuarioId: "user_1", obraId: "obra_1" });

    expect(upsert).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_1" } },
      create: { usuarioId: "user_1", obraId: "obra_1" },
      update: {},
    });
  });
});
