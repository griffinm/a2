import { Config } from './Config';
import { Logger } from './Logger';
import { Redis } from './Redis';

const CACHE_TTL = 60 * 60 * 48; // 48 hours
const CACHE_PREFIX = "google-search";

export class GoogleSearch {
  private logger: Logger;
  private apiKey: string;
  private searchId: string;
  private redis: Redis;

  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.redis = new Redis();
    const config = new Config();
    this.apiKey = config.getConfig('googleSearchApiKey');
    this.searchId = config.getConfig('googleSearchId');
  }

  async search(query: string) {
    this.logger.debug(`Searching for ${query}`);
    const cacheKey = this.cacheKey(query);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${query}`);
      return JSON.parse(cached);
    }

    this.logger.debug(`Cache miss for ${query}. Executing search`);

    const response = await fetch(this.getSearchUrl(query));
    const data = await response.json();
    await this.redis.set({
      key: cacheKey,
      value: JSON.stringify(data),
      ttl: CACHE_TTL,
    });
    return data;
  }

  private getSearchUrl(query: string) {
    return `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchId}&q=${query}`;
  }

  private cacheKey(query: string): string {
    return `${CACHE_PREFIX}:${query}`;
  }
}