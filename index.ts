import { GoogleSearch } from '@/GoogleSearch';
import { Logger } from '@/Logger';
import { Redis } from '@/Redis';
import { Config } from '@/Config';
import 'dotenv/config';
import { Ollama } from '@/Ollama';
import { DB } from '@/DB';
import { ResearchService } from '@/research/ResearchService';

let googleSearch: GoogleSearch;
let redis: Redis;
const config = new Config();
const db = new DB({ config });
const logger = new Logger("main");
const ollama = new Ollama({ config });

async function initServices() {
  logger.info("Initializing services");
  
  redis = new Redis({ config });
  while (!redis.isConnected()) {
    logger.debug("Waiting for Redis to connect");
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  googleSearch = new GoogleSearch({ redis, config });

  while (!db.isConnected()) {
    logger.debug("Waiting for DB to connect");
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

async function shutdownServices() {
  logger.info("Shutting down services");
  await redis.disconnect();
  await db.disconnect();
}

async function startResearch({ query }: { query: string }) {
  const researchService = new ResearchService({ db, config, ollama });
  const task = await researchService.startResearch({ query });
}

async function main() {
  await initServices();
  await startResearch({ query: "What is the best way to not smell bad?" });
  await shutdownServices();
}

logger.info('Application Starting');
main();
