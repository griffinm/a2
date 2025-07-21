import { Config } from './Config';
import { Logger } from './Logger';

export class GoogleSearch {
  private logger: Logger;
  private apiKey: string;
  private searchId: string;

  constructor() {
    this.logger = new Logger(this.constructor.name);
    const config = new Config();
    this.apiKey = config.getConfig('googleSearchApiKey');
    this.searchId = config.getConfig('googleSearchId');
  }

  async search(query: string) {
    this.logger.debug(`Searching for ${query}`);
    const response = await fetch(this.getSearchUrl(query));
    const data = await response.json();
    return data;
  }

  private getSearchUrl(query: string) {
    return `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchId}&q=${query}`;
  }
}