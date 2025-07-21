import { Config } from "@/Config";
import { Logger } from "@/Logger";
import { Redis } from "@/Redis";
import { GoogleSearchResult } from "@/types";

const CACHE_TTL = 60 * 60 * 48; // 48 hours
const CACHE_PREFIX = "google-search";

export class GoogleSearch {
  private logger: Logger;
  private apiKey: string;
  private searchId: string;
  private redis: Redis;

  constructor({
    redis,
    config,
  }: {
    redis: Redis;
    config: Config;
  }) {
    this.logger = new Logger(this.constructor.name);
    this.redis = redis;
    this.apiKey = config.getConfig('googleSearchApiKey');
    this.searchId = config.getConfig('googleSearchId');
  }

  async search(query: string): Promise<GoogleSearchResult[]> {
    this.logger.debug(`Searching for ${query}`);
    const cacheKey = this.cacheKey(query);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${query}`);
      return JSON.parse(cached) as unknown as GoogleSearchResult[];
    }

    this.logger.debug(`Cache miss for ${query}. Executing search`);

    const response = await fetch(this.getSearchUrl(query));
    const data = await response.json();
    const parsedResults = this.parseResults(data);
    await this.redis.set({
      key: cacheKey,
      value: JSON.stringify(parsedResults),
      ttl: CACHE_TTL,
    });
    return parsedResults;
  }

  private parseResults(data: any): GoogleSearchResult[] {
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }
    return data.items.map((item: any) => ({
      kind: item.kind,
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })) as GoogleSearchResult[];
  }

  private getSearchUrl(query: string) {
    return `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchId}&q=${query}`;
  }

  private cacheKey(query: string): string {
    return `${CACHE_PREFIX}:${query}`;
  }
}
