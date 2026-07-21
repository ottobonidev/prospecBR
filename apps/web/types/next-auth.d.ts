import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      contaId: string;
      papel: "LOJISTA" | "VENDEDOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}

// next-auth/jwt and next-auth both re-export their JWT/Session/User types from
// @auth/core (via `export *` / `export type { ... }`), which TypeScript does
// not treat as a local declaration for merging purposes. The augmentations
// above keep public typings correct for consumers importing from "next-auth"
// and "next-auth/jwt"; these augmentations target the actual modules where
// NextAuth's internal callback types resolve JWT/User/Session from, so the
// extra fields are recognized inside auth.ts's jwt/session callbacks.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      contaId: string;
      papel: "LOJISTA" | "VENDEDOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    contaId: string;
    papel: "LOJISTA" | "VENDEDOR";
  }
}
