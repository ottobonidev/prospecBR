import { startPingWorker } from "./queues/ping-queue";
import { startObrasSyncWorker, agendarSincronizacaoDiaria } from "./queues/obras-sync-queue";

const pingWorker = startPingWorker();
pingWorker.on("completed", (job) => {
  console.log(`[ping-worker] job ${job.id} completed`);
});
pingWorker.on("failed", (job, err) => {
  console.error(`[ping-worker] job ${job?.id} failed`, err);
});

const obrasSyncWorker = startObrasSyncWorker();
obrasSyncWorker.on("completed", (job, resultado) => {
  console.log(`[obras-sync-worker] job ${job.id} completed`, resultado);
});
obrasSyncWorker.on("failed", (job, err) => {
  console.error(`[obras-sync-worker] job ${job?.id} failed`, err);
});

// Fail-fast: sem o agendamento, o worker rodaria para sempre sem nunca
// sincronizar — melhor derrubar o processo e deixar o supervisor reiniciar.
agendarSincronizacaoDiaria().catch((err) => {
  console.error("[obras-sync-worker] failed to schedule daily sync", err);
  process.exit(1);
});

console.log("[worker] conecta-obras worker running, listening on queues: ping, obras-sync");
