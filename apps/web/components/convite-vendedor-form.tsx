"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().email("Email inválido") });
type FormData = z.infer<typeof schema>;

export function ConviteVendedorForm() {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErro(null);
    setLink(null);
    const res = await fetch("/api/vendedores/convite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      setErro("Não foi possível gerar o convite");
      return;
    }

    const body = await res.json();
    setLink(`${window.location.origin}/convite/${body.token}`);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3">
      <div>
        <Label htmlFor="email">Email do vendedor</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Gerando..." : "Gerar convite"}
      </Button>
      {link && (
        <p className="text-sm text-slate-600">
          Link: <code className="rounded bg-slate-100 px-1">{link}</code>
        </p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
