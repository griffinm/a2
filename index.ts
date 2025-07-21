import { GoogleSearch } from './src/GoogleSearch';
import 'dotenv/config';
import { Logger } from './src/Logger';

const logger = new Logger("main");

async function main() {
  const googleSearch = new GoogleSearch();

  logger.debug('Application Starting');
  const results = await googleSearch.search('TypeScript');
  // logger.info(`Found ${results.items.length} results`);
  // logger.info(JSON.stringify(results, null, 2));
}

main();