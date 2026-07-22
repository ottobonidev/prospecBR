import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@conecta-obras/db";
import { connection } from "../redis";
import { fecharFaturaMensal } from "../services/fechamento-fatura";
import { mesReferenciaAnterior } from "../lib/mes-referencia";

export const FATURA_MENSAL_QUEUE_NAME = "fatura-mensal";

export const faturaMensalQueue = new Queue(FATURA_MENSAL_QUEUE_NAME, { connection });

export async function agendarFechamentoMensal() {
  await faturaMensalQueue.add(
    "fechamento-mensal",
    {},
    {
      repeat: { pattern: "0 4 1 * *" },
      jobId: "fatura-mensal-fechamento",
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
    }
  );
}

export function startFaturaMensalWorker() {
  return new Worker(
    FATURA_MENSAL_QUEUE_NAME,
    async (_job: Job) => {
      const mesReferencia = mesReferenciaAnterior();
      return fecharFaturaMensal(prisma, mesReferencia);
    },
    { connection }
  );
}
