import { describe, it, expect, vi } from "vitest";
import { criarAgendamento, listarAgendamentos } from "../services/obraAgendamento";

describe("criarAgendamento", () => {
  it("cria um agendamento com o payload completo", async () => {
    const create = vi.fn().mockResolvedValue({ id: "agend_1" });
    const prisma = { agendamento: { create } } as any;

    const dataHora = new Date("2026-08-01T14:30:00.000Z");
    const resultado = await criarAgendamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_1",
      dataHora,
      titulo: "Visita técnica",
      descricao: "levar catálogo",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_1",
        dataHora,
        titulo: "Visita técnica",
        descricao: "levar catálogo",
      },
    });
    expect(resultado).toEqual({ id: "agend_1" });
  });

  it("passa descricao null quando ausente", async () => {
    const create = vi.fn().mockResolvedValue({ id: "agend_2" });
    const prisma = { agendamento: { create } } as any;

    const dataHora = new Date("2026-08-02T09:00:00.000Z");
    await criarAgendamento(prisma, {
      usuarioId: "user_1",
      contaId: "conta_1",
      obraId: "obra_2",
      dataHora,
      titulo: "Ligar",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        contaId: "conta_1",
        usuarioId: "user_1",
        obraId: "obra_2",
        dataHora,
        titulo: "Ligar",
        descricao: null,
      },
    });
  });
});

describe("listarAgendamentos", () => {
  it("lista agendamentos do usuario com obra e ordem por data decrescente", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "agend_1", obra: { id: "obra_1" } }]);
    const prisma = { agendamento: { findMany } } as any;

    const resultado = await listarAgendamentos(prisma, { usuarioId: "user_1" });

    expect(findMany).toHaveBeenCalledWith({
      where: { usuarioId: "user_1" },
      include: { obra: true },
      orderBy: { dataHora: "desc" },
    });
    expect(resultado).toEqual([{ id: "agend_1", obra: { id: "obra_1" } }]);
  });
});
