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
      // tz UTC: mesReferenciaAnterior() calcula em UTC — sem isso, um host
      // UTC-positivo dispararia às 04:00 locais do dia 1 ainda no mês anterior em UTC.
      repeat: { pattern: "0 4 1 * *", tz: "UTC" },
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
