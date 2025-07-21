export type ConfigKeys = 'googleSearchApiKey' | 'googleSearchId' | 'loggerLevel';

type ConfigType = {
  googleSearchApiKey: string;
  googleSearchId: string;
  loggerLevel: string;
};

export class Config {
  private config: Record<ConfigKeys, string>;

  public constructor() {
    this.config = {
      googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
      googleSearchId: process.env.GOOGLE_SEARCH_ID || '',
      loggerLevel: process.env.LOGGER_LEVEL || 'info',
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