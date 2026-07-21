import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import { getSessionContext, ForbiddenError, UnauthorizedError } from "../session";

describe("getSessionContext", () => {
  it("returns userId/contaId/papel from the session", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user_1", contaId: "conta_1", papel: "LOJISTA" },
    });

    const ctx = await getSessionContext();

    expect(ctx).toEqual({ userId: "user_1", contaId: "conta_1", papel: "LOJISTA" });
  });

  it("throws UnauthorizedError when there is no session", async () => {
    (auth as any).mockResolvedValue(null);

    await expect(getSessionContext()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireLojista throws ForbiddenError for a VENDEDOR", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user_2", contaId: "conta_1", papel: "VENDEDOR" },
    });

    const ctx = await getSessionContext();
    expect(() => ctx.requireLojista()).toThrow(ForbiddenError);
  });
});
