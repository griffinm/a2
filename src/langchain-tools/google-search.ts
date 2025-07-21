import { GoogleSearch } from "@/GoogleSearch";
import { DynamicTool } from "langchain/tools";

export const googleSearchTool = (googleSearch: GoogleSearch) => new DynamicTool({
  name: "google-search",
  description: "Search the web for information",
  func: async (query: string) => {
    const results = await googleSearch.search(query);
    return JSON.stringify(results);
  },
});
