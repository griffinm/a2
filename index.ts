import { GoogleSearch } from '@/GoogleSearch';
import { Logger } from '@/Logger';
import { Redis } from '@/Redis';
import { Config } from '@/Config';
import 'dotenv/config';

let googleSearch: GoogleSearch;
let redis: Redis;
const config = new Config();
const logger = new Logger("main");

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
  
  const results = await googleSearch.search('griffin');
  logger.info(`Found ${results.length} results`);
  logger.info(JSON.stringify(results, null, 2));
  await shutdownServices();
}

logger.info('Application Starting');
main();
