import { Logger } from "@/Logger";
import { Config } from "@/Config";
import { JsonObject } from "./generated/prisma/runtime/library";
import z from "zod";

export class Ollama {
  private logger: Logger;
  private config: Config;
  private ollamaUrl: string;

  constructor({
    config,
  }: {
    config: Config;
  }) {
    this.logger = new Logger(this.constructor.name);
    this.config = config;
    this.ollamaUrl = config.getConfig('ollamaUrl');
  }

  /**
   * Generate a completion from the Ollama LLM.
   * @param prompt The prompt to send to the LLM.
   * @param model The model to use (default: 'llama2').
   */
  public async generateCompletion({
    prompt,
    model = 'gemma3:27b',
    format,
  }: {
    prompt: string;
    model?: string;
    format?: JsonObject;
  }): Promise<string> {
    const url = `${this.ollamaUrl}/api/generate`;

    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
      format,
    });
  
    this.logger.debug(`Sending prompt to Ollama`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Ollama API error: ${errorText}`);
      throw new Error(`Ollama API error: ${response.status}`);
    }
    const data = await response.json();

    return data.response;
  }
}
