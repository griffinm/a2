import { Logger } from "@/Logger";
import { Config } from "@/Config";

export class Ollama {
  private logger: Logger;
  private config: Config;

  constructor({
    config,
  }: {
    config: Config;
  }) {
    this.logger = new Logger(this.constructor.name);
    this.config = config;
  }
}
