import { Queue, Worker, type Job } from "bullmq";
import { connection } from "../redis";

export const PING_QUEUE_NAME = "ping";

export const pingQueue = new Queue(PING_QUEUE_NAME, { connection });

export function startPingWorker() {
  return new Worker(
    PING_QUEUE_NAME,
    async (job: Job) => {
      console.log(`[ping-worker] processed job ${job.id} with data`, job.data);
      return { pong: true, receivedAt: new Date().toISOString() };
    },
    { connection }
  );
}
