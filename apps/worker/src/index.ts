import { startPingWorker } from "./queues/ping-queue";

const worker = startPingWorker();

worker.on("completed", (job) => {
  console.log(`[ping-worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[ping-worker] job ${job?.id} failed`, err);
});

console.log("[worker] conecta-obras worker running, listening on queue: ping");
