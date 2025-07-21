import { GoogleSearch } from './src/GoogleSearch';
import 'dotenv/config';
import { Logger } from './src/Logger';
import { Redis } from './src/Redis';

let googleSearch: GoogleSearch;
let redis: Redis;
const logger = new Logger("main");

async function initServices() {
  logger.info("Initializing services");
  
  redis = new Redis();
  while (!redis.isConnected()) {
    logger.debug("Waiting for Redis to connect");
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  googleSearch = new GoogleSearch({ redis });
}

async function shutdownServices() {
  logger.info("Shutting down services");
  await redis.disconnect();
}

async function main() {
  await initServices();
  
  const results = await googleSearch.search('TypeScript');
  logger.info(`Found ${results.items.length} results`);
  // logger.info(JSON.stringify(results, null, 2));
  await shutdownServices();
}

logger.info('Application Starting');
main();
