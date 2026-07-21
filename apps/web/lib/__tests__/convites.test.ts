import { describe, it, expect, vi } from "vitest";
import { gerarConviteVendedor, aceitarConvite } from "../services/convites";

describe("gerarConviteVendedor", () => {
  it("creates a ConviteVendedor with a token and 7-day expiry", async () => {
    const created = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const prisma = {
      conviteVendedor: { create: vi.fn().mockResolvedValue(created) },
    } as any;

    const result = await gerarConviteVendedor(prisma, {
      contaId: "conta_1",
      email: "vendedor@lojax.com",
    });

    expect(prisma.conviteVendedor.create).toHaveBeenCalledOnce();
    const callArgs = prisma.conviteVendedor.create.mock.calls[0][0];
    expect(callArgs.data.contaId).toBe("conta_1");
    expect(callArgs.data.email).toBe("vendedor@lojax.com");
    expect(typeof callArgs.data.token).toBe("string");
    expect(callArgs.data.token.length).toBeGreaterThan(10);
    expect(result.id).toBe("convite_1");
  });
});

describe("aceitarConvite", () => {
  function mockPrisma(convite: any) {
    const txUsuarioCreate = vi.fn().mockResolvedValue({ id: "user_2", papel: "VENDEDOR" });
    const txConviteUpdate = vi.fn().mockResolvedValue({ aceitoEm: new Date() });
    return {
      conviteVendedor: {
        findUnique: vi.fn().mockResolvedValue(convite),
        update: vi.fn().mockResolvedValue({ ...convite, aceitoEm: new Date() }),
      },
      usuario: {
        create: vi.fn().mockResolvedValue({ id: "user_2", papel: "VENDEDOR" }),
      },
      $transaction: vi.fn().mockImplementation(async (fn: any) =>
        fn({
          usuario: { create: txUsuarioCreate },
          conviteVendedor: { update: txConviteUpdate },
        })
      ),
      __tx: { txUsuarioCreate, txConviteUpdate },
    } as any;
  }

  it("creates a VENDEDOR Usuario and marks the invite accepted", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: null,
      expiraEm: new Date(Date.now() + 60_000),
    };
    const prisma = mockPrisma(convite);

    const result = await aceitarConvite(prisma, {
      token: "abc123",
      nome: "Bruno",
      senha: "senha-forte-123",
    });

    expect(result.papel).toBe("VENDEDOR");

    // Verify the actual data passed to tx.usuario.create, not just the mocked
    // return value — a bug that sends the wrong contaId/email/papel would
    // otherwise slip through undetected.
    const { txUsuarioCreate, txConviteUpdate } = prisma.__tx;
    expect(txUsuarioCreate).toHaveBeenCalledOnce();
    const usuarioArgs = txUsuarioCreate.mock.calls[0][0];
    expect(usuarioArgs.data.contaId).toBe("conta_1");
    expect(usuarioArgs.data.email).toBe("vendedor@lojax.com");
    expect(usuarioArgs.data.nome).toBe("Bruno");
    expect(usuarioArgs.data.papel).toBe("VENDEDOR");
    expect(typeof usuarioArgs.data.senhaHash).toBe("string");
    expect(usuarioArgs.data.senhaHash).not.toBe("senha-forte-123");

    expect(txConviteUpdate).toHaveBeenCalledOnce();
    const conviteArgs = txConviteUpdate.mock.calls[0][0];
    expect(conviteArgs.where.id).toBe("convite_1");
    expect(conviteArgs.data.aceitoEm).toBeInstanceOf(Date);
  });

  it("throws if token does not exist", async () => {
    const prisma = mockPrisma(null);

    await expect(
      aceitarConvite(prisma, { token: "invalido", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_INVALIDO");
  });

  it("throws if invite already accepted", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: new Date(),
      expiraEm: new Date(Date.now() + 60_000),
    };
    const prisma = mockPrisma(convite);

    await expect(
      aceitarConvite(prisma, { token: "abc123", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_JA_ACEITO");
  });

  it("throws if invite is expired", async () => {
    const convite = {
      id: "convite_1",
      contaId: "conta_1",
      email: "vendedor@lojax.com",
      token: "abc123",
      aceitoEm: null,
      expiraEm: new Date(Date.now() - 60_000),
    };
    const prisma = mockPrisma(convite);

    await expect(
      aceitarConvite(prisma, { token: "abc123", nome: "Bruno", senha: "senha-forte-123" })
    ).rejects.toThrow("CONVITE_EXPIRADO");
  });
});
