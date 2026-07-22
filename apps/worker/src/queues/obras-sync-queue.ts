import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@conecta-obras/db";
import { connection } from "../redis";
import { sincronizarObras } from "../services/obras-sync";
import { BaseDosDadosObrasClient } from "../lib/basedosdados-client";

export const OBRAS_SYNC_QUEUE_NAME = "obras-sync";
const CURSOR_ID = "obras_sync_cursor";
const EPOCA_INICIAL = new Date("2024-08-01T00:00:00.000Z");

export const obrasSyncQueue = new Queue(OBRAS_SYNC_QUEUE_NAME, { connection });

export async function agendarSincronizacaoDiaria() {
  await obrasSyncQueue.add(
    "sync-diario",
    {},
    {
      repeat: { pattern: "0 3 * * *", tz: "UTC" },
      jobId: "obras-sync-diario",
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
    }
  );
}

export function startObrasSyncWorker() {
  return new Worker(
    OBRAS_SYNC_QUEUE_NAME,
    async (_job: Job) => {
      const cursorAtual = await prisma.obrasSyncCursor.findUnique({ where: { id: CURSOR_ID } });
      const desde = cursorAtual?.ultimaSincronizacao ?? EPOCA_INICIAL;

      const fonte = new BaseDosDadosObrasClient();
      const resultado = await sincronizarObras(prisma, fonte, desde);

      // Página parcial sem avanço do cursor é quiescência normal (o `>=`
      // re-busca as linhas de fronteira). Livelock real é página CHEIA sem
      // avanço: mais linhas empatadas no timestamp do que cabe numa página.
      if (
        resultado.processadas >= BaseDosDadosObrasClient.LIMITE_PAGINA &&
        resultado.novoCursor.getTime() === desde.getTime()
      ) {
        console.warn(
          `[obras-sync-worker] possivel livelock: pagina cheia (${resultado.processadas} linhas) sem avanco do cursor (${desde.toISOString()}) — mais de ${BaseDosDadosObrasClient.LIMITE_PAGINA} linhas com o mesmo timestamp?`
        );
      }

      await prisma.obrasSyncCursor.upsert({
        where: { id: CURSOR_ID },
        create: { id: CURSOR_ID, ultimaSincronizacao: resultado.novoCursor },
        update: { ultimaSincronizacao: resultado.novoCursor },
      });

      return resultado;
    },
    { connection }
  );
}
