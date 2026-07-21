"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    const result = await signIn("credentials", {
      email: data.email,
      senha: data.senha,
      redirect: false,
    });

    if (result?.error) {
      setErro("Email ou senha inválidos");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" {...register("senha")} />
              {errors.senha && <p className="text-xs text-red-600">{errors.senha.message}</p>}
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Não tem conta?{" "}
              <a href="/cadastro" className="underline">
                Criar conta
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
