import { PrismaClient } from "@prisma/client";
import { Logger } from "./Logger";
import { Config } from "./Config";

export class DB {
  private prisma: PrismaClient;
  private logger: Logger;
  private connected: boolean;

  constructor({ config }: { config: Config }) {
    this.logger = new Logger("DB");
    this.logger.debug(`Connecting to DB`);
    this.connected = false;
    this.prisma = new PrismaClient({
      // log: ["query", "info", "warn", "error"],
      datasources: {
        db: {
          url: config.getConfig("databaseUrl"),
        },
      },
    });
    this.prisma.$connect()
      .then(() => {
        this.logger.debug("Prisma connected");
        this.connected = true;
      })
      .catch((error) => {
        this.logger.error("Prisma connection failed");
        this.connected = false;
      });
  }

  public isConnected() {
    return this.connected;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  public getClient() {
    return this.prisma;
  }
}