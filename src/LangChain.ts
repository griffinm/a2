import { GoogleSearch } from "@/GoogleSearch";
import { Ollama } from "@/Ollama";

export class LangChain {
  private googleSearch: GoogleSearch;
  private ollama: Ollama;

  constructor({ googleSearch, ollama }: { googleSearch: GoogleSearch; ollama: Ollama }) {
    this.googleSearch = googleSearch;
    this.ollama = ollama;
  }

  /**
   * Runs the research agent: plans, executes, and aggregates results for a given prompt.
   */
  public async runResearchAgent(prompt: string): Promise<string> {
    // 1. Ask the LLM to make a plan
    const planPrompt = `You are a research agent. Given the following task, break it down into a numbered list of clear, concrete steps.\n\nTask: ${prompt}\n\nPlan:`;
    const planText = await this.ollama.generateCompletion({ prompt: planPrompt });

    // 2. Parse the plan into steps (expects numbered list)
    // Only keep lines that start with a number and a dot (e.g., '1. ...')
    const stepLines = planText
      .split(/\n+/)
      .filter(line => /^\d+\.\s+/.test(line.trim()));
    const steps = stepLines
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    let results: string[] = [];

    // 3. Execute each step
    for (const step of steps) {
      // If the step calls for a Google search, use Google Search
      if (/(search for|google|look up)/i.test(step)) {
        // Extract the actual search query if possible
        const searchMatch = step.match(/(?:search for|google|look up)\s*:?\s*(.*)/i);
        const searchQuery = searchMatch && searchMatch[1] ? searchMatch[1].trim() : step;
        const searchResults = await this.googleSearch.search(searchQuery);
        if (searchResults && searchResults.length > 0) {
          results.push(`Step: ${step}\nTop result: ${searchResults[0].snippet}\nLink: ${searchResults[0].link}`);
        } else {
          results.push(`Step: ${step}\nNo results found.`);
        }
      } else {
        // Otherwise, use the LLM to complete the step
        const llmResult = await this.ollama.generateCompletion({ prompt: `Step: ${step}\nAnswer:` });
        results.push(`Step: ${step}\nLLM Answer: ${llmResult}`);
      }
    }

    // 4. Aggregate and return the results
    return [
      `Plan:\n${planText.trim()}`,
      '',
      'Results:',
      ...results
    ].join('\n\n');
  }
}
