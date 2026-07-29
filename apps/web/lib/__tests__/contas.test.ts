import { describe, it, expect, vi } from "vitest";
import { criarContaComLojista } from "../services/contas";

function mockPrisma() {
  const conta = {
    id: "conta_" + Math.random().toString(36).slice(2),
    nomeEmpresa: "Loja X",
    cnpj: "12345678000199",
  };
  const usuario = { id: "user_1", contaId: conta.id, papel: "LOJISTA" };
  const txContaCreate = vi.fn().mockResolvedValue(conta);
  const txUsuarioCreate = vi.fn().mockResolvedValue(usuario);
  const txCreditPlanCreate = vi.fn().mockResolvedValue({ id: "plan_1", contaId: conta.id });
  const prisma = {
    conta: { findUnique: vi.fn().mockResolvedValue(null) },
    usuario: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockImplementation(async (fn: any) =>
      fn({
        conta: { create: txContaCreate },
        usuario: { create: txUsuarioCreate },
        creditPlan: { create: txCreditPlanCreate },
      })
    ),
  } as any;
  return { prisma, conta, txContaCreate, txUsuarioCreate, txCreditPlanCreate };
}

describe("criarContaComLojista", () => {
  it("creates Conta, Usuario(LOJISTA) and a default CreditPlan in a transaction", async () => {
    const { prisma, conta, txContaCreate, txUsuarioCreate, txCreditPlanCreate } = mockPrisma();

    const result = await criarContaComLojista(prisma, {
      nomeEmpresa: "Loja X",
      cnpj: "12345678000199",
      nome: "Ana",
      email: "ana@lojax.com",
      senha: "senha-forte-123",
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result.conta.id).toBe(conta.id);
    expect(result.usuario.papel).toBe("LOJISTA");

    expect(txContaCreate).toHaveBeenCalledWith({
      data: { nomeEmpresa: "Loja X", cnpj: "12345678000199" },
    });

    expect(txUsuarioCreate).toHaveBeenCalledOnce();
    const usuarioCreateArgs = txUsuarioCreate.mock.calls[0][0];
    expect(usuarioCreateArgs.data).toMatchObject({
      contaId: conta.id,
      nome: "Ana",
      email: "ana@lojax.com",
      papel: "LOJISTA",
    });
    expect(typeof usuarioCreateArgs.data.senhaHash).toBe("string");
    expect(usuarioCreateArgs.data.senhaHash.length).toBeGreaterThan(0);
    expect(usuarioCreateArgs.data.senhaHash).not.toBe("senha-forte-123");

    expect(txCreditPlanCreate).toHaveBeenCalledOnce();
    const creditPlanArgs = txCreditPlanCreate.mock.calls[0][0];
    expect(creditPlanArgs.data.contaId).toBe(conta.id);
    expect(creditPlanArgs.data.cotaMensalGratis).toBeGreaterThan(0);
  });

  it("does not create a CreditPlan when a step in the transaction fails (atomicity)", async () => {
    const { prisma, txUsuarioCreate, txCreditPlanCreate } = mockPrisma();
    txUsuarioCreate.mockRejectedValueOnce(new Error("db error"));

    await expect(
      criarContaComLojista(prisma, {
        nomeEmpresa: "Loja X",
        cnpj: "12345678000199",
        nome: "Ana",
        email: "ana@lojax.com",
        senha: "senha-forte-123",
      })
    ).rejects.toThrow("db error");

    expect(txCreditPlanCreate).not.toHaveBeenCalled();
  });

  it("throws if email is already in use", async () => {
    const { prisma } = mockPrisma();
    prisma.usuario.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      criarContaComLojista(prisma, {
        nomeEmpresa: "Loja X",
        cnpj: "12345678000199",
        nome: "Ana",
        email: "ana@lojax.com",
        senha: "senha-forte-123",
      })
    ).rejects.toThrow("EMAIL_EM_USO");
  });

  it("throws if cnpj is already in use", async () => {
    const { prisma } = mockPrisma();
    prisma.conta.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      criarContaComLojista(prisma, {
        nomeEmpresa: "Loja X",
        cnpj: "12345678000199",
        nome: "Ana",
        email: "ana@lojax.com",
        senha: "senha-forte-123",
      })
    ).rejects.toThrow("CNPJ_EM_USO");
  });
});
