import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@conecta-obras/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || usuario.status !== "ATIVO") return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          contaId: usuario.contaId,
          papel: usuario.papel,
          name: usuario.nome,
          email: usuario.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        // `User.id` is optional in @auth/core's base type (for OAuth/adapter
        // flows); our Credentials `authorize()` above always returns it, so
        // the non-null assertion is safe here.
        token.id = user.id!;
        token.contaId = user.contaId;
        token.papel = user.papel;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.contaId = token.contaId;
      session.user.papel = token.papel;
      return session;
    },
  },
});
