import { createClient } from "redis";
import { Logger } from "./Logger";

export class Redis {
  private static client: ReturnType<typeof createClient>;
  private logger: Logger;
  private connected: boolean;

  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.logger.debug("Connecting to Redis");
    this.connected = false;
    Redis.client = createClient({
      url: "redis://localhost:6379",
    });

    this.connect();
  }

  async connect() {
    if (this.connected) {
      return;
    }

    await Redis.client.connect();
    this.connected = true;
    this.logger.debug("Connected to Redis");
  }

  async get(key: string) {
    return await Redis.client.get(key);
  }

  async set({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: string;
    ttl?: number;
  }) {
    await Redis.client.set(key, value, { EX: ttl });
  }

  public isConnected() {
    return this.connected;
  }

  async del(key: string) {
    await Redis.client.del(key);
  }

  async keys(pattern: string) {
    return await Redis.client.keys(pattern);
  }

  async exists(key: string) {
    return await Redis.client.exists(key);
  }

  async expire(key: string, seconds: number) {
    await Redis.client.expire(key, seconds);
  }

  async ttl(key: string) {
    return await Redis.client.ttl(key);
  }

  async hget(key: string, field: string) {
    return await Redis.client.hGet(key, field);
  }

  async hset(key: string, field: string, value: string) {
    await Redis.client.hSet(key, field, value);
  }

  async hgetall(key: string) {
    return await Redis.client.hGetAll(key);
  }

  async hdel(key: string, field: string) {
    await Redis.client.hDel(key, field);
  }

  async hkeys(key: string) {
    return await Redis.client.hKeys(key);
  }

  async hvals(key: string) {
    return await Redis.client.hVals(key);
  }

  async hlen(key: string) {
    return await Redis.client.hLen(key);
  }

  async hsetnx(key: string, field: string, value: string) {
    await Redis.client.hSetNx(key, field, value);
  }

  async disconnect() {
    if (this.connected) {
      await Redis.client.quit();
      this.connected = false;
      this.logger.debug("Disconnected from Redis");
    }
  }
}
