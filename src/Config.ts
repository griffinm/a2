export type ConfigKeys = 
  'googleSearchApiKey' |
  'googleSearchId' |
  'loggerLevel' |
  'redisUrl' |
  'ollamaUrl' |
  'databaseUrl';

type ConfigType = {
  googleSearchApiKey: string;
  googleSearchId: string;
  loggerLevel: string;
  redisUrl: string;
  ollamaUrl: string;
  databaseUrl: string;
};

export class Config {
  private config: Record<ConfigKeys, string>;

  public constructor() {
    this.config = {
      googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
      googleSearchId: process.env.GOOGLE_SEARCH_ID || '',
      loggerLevel: process.env.LOGGER_LEVEL || 'info',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/a2',
    }

    // The Google Search API Key and ID are required
    if (!this.config.googleSearchApiKey || !this.config.googleSearchId) {
      throw new Error('GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ID must be set');
    }
  }

  public getConfig(key: ConfigKeys): string {
    return this.config[key as keyof ConfigType];
  }
}
