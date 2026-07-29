import IORedis from "ioredis";

const url = process.env.UPSTASH_REDIS_URL;
if (!url) {
  throw new Error("UPSTASH_REDIS_URL não configurada");
}

export const connection = new IORedis(url, {
  maxRetriesPerRequest: null,
});
