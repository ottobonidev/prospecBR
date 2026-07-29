import { describe, it, expect, vi } from "vitest";
import {
  salvarAcompanhamento,
  buscarAcompanhamento,
  listarAcompanhamentos,
} from "../services/obraAcompanhamento";

describe("salvarAcompanhamento", () => {
  it("faz upsert por (usuarioId, obraId) com o payload completo", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "acomp_1" });
    const prisma = { acompanhamento: { upsert } } as any;

    const resultado = await salvarAcompanhamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_1",
      status: "CONTATO",
      temperatura: "QUENTE",
      probabilidade: 75,
      anotacoes: "ligou, retornar terça",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_1" } },
      create: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_1",
        status: "CONTATO",
        temperatura: "QUENTE",
        probabilidade: 75,
        anotacoes: "ligou, retornar terça",
      },
      update: {
        status: "CONTATO",
        temperatura: "QUENTE",
        probabilidade: 75,
        anotacoes: "ligou, retornar terça",
      },
    });
    expect(resultado).toEqual({ id: "acomp_1" });
  });

  it("passa null nos campos opcionais quando ausentes", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "acomp_2" });
    const prisma = { acompanhamento: { upsert } } as any;

    await salvarAcompanhamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_2",
      status: "SELECAO",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_2" } },
      create: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_2",
        status: "SELECAO",
        temperatura: null,
        probabilidade: null,
        anotacoes: null,
      },
      update: {
        status: "SELECAO",
        temperatura: null,
        probabilidade: null,
        anotacoes: null,
      },
    });
  });
});

describe("buscarAcompanhamento", () => {
  it("retorna o registro existente do vendedor para a obra", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "acomp_1", status: "CONTATO" });
    const prisma = { acompanhamento: { findUnique } } as any;

    const resultado = await buscarAcompanhamento(prisma, {
      usuarioId: "user_1",
      obraId: "obra_1",
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { usuarioId_obraId: { usuarioId: "user_1", obraId: "obra_1" } },
    });
    expect(resultado).toEqual({ id: "acomp_1", status: "CONTATO" });
  });

  it("retorna null quando não há acompanhamento", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { acompanhamento: { findUnique } } as any;

    const resultado = await buscarAcompanhamento(prisma, {
      usuarioId: "user_1",
      obraId: "obra_x",
    });

    expect(resultado).toBeNull();
  });
});

describe("listarAcompanhamentos", () => {
  it("lista acompanhamentos do usuario com obra e ordem decrescente", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "acomp_1", obra: { id: "obra_1" } }]);
    const prisma = { acompanhamento: { findMany } } as any;

    const resultado = await listarAcompanhamentos(prisma, { usuarioId: "user_1" });

    expect(findMany).toHaveBeenCalledWith({
      where: { usuarioId: "user_1" },
      include: { obra: true },
      orderBy: { criadoEm: "desc" },
    });
    expect(resultado).toEqual([{ id: "acomp_1", obra: { id: "obra_1" } }]);
  });
});
