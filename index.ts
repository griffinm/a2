import { GoogleSearch } from '@/GoogleSearch';
import { Logger } from '@/Logger';
import { Redis } from '@/Redis';
import { Config } from '@/Config';
import 'dotenv/config';
import { LangChain } from '@/LangChain';
import { Ollama } from '@/Ollama';

let googleSearch: GoogleSearch;
let redis: Redis;
const config = new Config();
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
}

async function shutdownServices() {
  logger.info("Shutting down services");
  await redis.disconnect();
}

async function main() {
  await initServices();
  
  const task = "What is the best way to not smell bad?"
  const langChain = new LangChain({ googleSearch, ollama });
  const results = await langChain.runResearchAgent(task);
  logger.info(results);
  await shutdownServices();
}

logger.info('Application Starting');
main();
