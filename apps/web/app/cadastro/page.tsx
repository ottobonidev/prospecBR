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
  nomeEmpresa: z.string().min(2, "Informe o nome da empresa"),
  cnpj: z.string().min(11, "CNPJ inválido"),
  nome: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      const mensagens: Record<string, string> = {
        EMAIL_EM_USO: "Email já cadastrado",
        CNPJ_EM_USO: "CNPJ já cadastrado",
      };
      setErro(mensagens[body.error] ?? "Erro ao criar conta");
      return;
    }

    await signIn("credentials", { email: data.email, senha: data.senha, redirect: false });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta lojista</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
              <Input id="nomeEmpresa" {...register("nomeEmpresa")} />
              {errors.nomeEmpresa && (
                <p className="text-xs text-red-600">{errors.nomeEmpresa.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" {...register("cnpj")} />
              {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" {...register("nome")} />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
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
              {isSubmitting ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
