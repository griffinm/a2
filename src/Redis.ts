import { createClient } from "redis";
import { Logger } from "./Logger";

export class Redis {
  private client: ReturnType<typeof createClient>;
  private logger: Logger;
  private connected: boolean;

  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.logger.debug("Connecting to Redis");
    this.connected = false;
    this.client = createClient({
      url: "redis://localhost:6379",
    });

    this.connect();
  }

  async connect() {
    if (this.connected) {
      return;
    }

    await this.client.connect();
    this.connected = true;
    this.logger.debug("Connected to Redis");
  }

  async get(key: string) {
    return await this.client.get(key);
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
    await this.client.set(key, value, { EX: ttl });
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async keys(pattern: string) {
    return await this.client.keys(pattern);
  }

  async exists(key: string) {
    return await this.client.exists(key);
  }

  async expire(key: string, seconds: number) {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string) {
    return await this.client.ttl(key);
  }

  async hget(key: string, field: string) {
    return await this.client.hGet(key, field);
  }

  async hset(key: string, field: string, value: string) {
    await this.client.hSet(key, field, value);
  }

  async hgetall(key: string) {
    return await this.client.hGetAll(key);
  }

  async hdel(key: string, field: string) {
    await this.client.hDel(key, field);
  }

  async hkeys(key: string) {
    return await this.client.hKeys(key);
  }

  async hvals(key: string) {
    return await this.client.hVals(key);
  }

  async hlen(key: string) {
    return await this.client.hLen(key);
  }

  async hsetnx(key: string, field: string, value: string) {
    await this.client.hSetNx(key, field, value);
  }
}