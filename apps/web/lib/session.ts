import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

export interface SessionContext {
  userId: string;
  contaId: string;
  papel: "LOJISTA" | "VENDEDOR";
  requireLojista: () => void;
}

// `requireLojista` is defined on the prototype (class method) rather than as
// an own enumerable property. This keeps `toEqual({ userId, contaId, papel })`
// comparisons passing in tests, since deep-equality checks only compare own
// enumerable properties — inherited prototype methods are ignored.
class SessionContextImpl implements SessionContext {
  userId: string;
  contaId: string;
  papel: "LOJISTA" | "VENDEDOR";

  constructor(userId: string, contaId: string, papel: "LOJISTA" | "VENDEDOR") {
    this.userId = userId;
    this.contaId = contaId;
    this.papel = papel;
  }

  requireLojista(): void {
    if (this.papel !== "LOJISTA") {
      throw new ForbiddenError();
    }
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const { id: userId, contaId, papel } = session.user;

  return new SessionContextImpl(userId, contaId, papel);
}
