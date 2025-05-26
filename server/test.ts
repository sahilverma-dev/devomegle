import { createClient } from "redis";
export const redis = createClient({
  url: "redis://localhost:6379",
});

await redis.connect();
// await redis.rPush("interest", "test");
console.log(await redis.get("queue:interest"));

redis.on("error", (e) => {
  console.log(e);
});
