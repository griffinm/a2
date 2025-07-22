import { Step } from "@prisma/client";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function getLlmStepPrompt({ currentStepText, originalQuery }: { currentStepText: string, originalQuery: string }) {
  return `
    #Task:
    You are a meticulous and helpful researcher. A research task has been broken down into steps and you will be given one of the steps.
    Your job is to research the step and provide a detailed response.

    #Guidelines:
    - Output a detailed response to the step.
    - Use clear, objective language for each step.
    - Do not include the answer — only the research or reasoning steps required to find it.

    #Original Research Task
    ${originalQuery}

    #Step for you to provide a response to:
    ${currentStepText}
  `;
}

export function getLlmStepPromptFormat() {
  const llmStepSchema = z.object({
    response: z.string(),
  });
  const jsonSchema = zodToJsonSchema(llmStepSchema);
  return jsonSchema.definitions?.LlmStepSchema || jsonSchema;
}

export function getStepPrompt({ query }: { query: string }) {
  return `
    #Task:
    You are a meticulous and helpful research assistant. Your job is to break down a user's question into a clear, ordered list of research tasks needed to answer it fully.

    #Guidelines:
    - Output a numbered list of distinct, non-overlapping steps.
    - Each step must describe a **single, atomic task** that can be completed independently.
    - Avoid combining multiple tasks into one step.
    - Use clear, objective language for each step.
    - Do not include the answer — only the research or reasoning steps required to find it.
    - Each step will have 2 parts, a step number and a step instruction.
    
    #User Question: 
    ${query}
  `;
}


export function getStepPromptFormat() {
  const stepSchema = z.object({
    steps: z.array(
      z.object({
        stepNumber: z.number(),
        stepInstruction: z.string(),
      })
    ),
  });
  const jsonSchema = zodToJsonSchema(stepSchema);
  return jsonSchema.definitions?.StepSchema || jsonSchema;
}

export function getToolPrompt({ stepText, originalQuery }: { stepText: string, originalQuery: string }) {
  return `
    You are an intelligent assistant helping to decide which tool to use for a step in a research task. 
    For the provided step, choose the most appropriate tool from the following options:

    - "web_search": Use this if the step requires up-to-date information, statistics, current events, or knowledge not likely to be known by an AI model.
    - "llm": Use this if the step involves reasoning, summarization, general knowledge, definitions, or making inferences from existing information.

    
    Instructions:
    - Output a JSON object indicating the best tool to use for the step.
    - Be thoughtful in your choice — only choose 'web_search' if the step clearly depends on external or real-time information.
    - Only use the tools provided - do not make up your own tools.
    
    Original Research Task:
    ${originalQuery}
    
    Step to determine tool for:
    ${stepText}

    Respond in this format:
    {
      "tool": "llm"
    }
  `;
}


export function getToolPromptFormat() {
  const toolSchema = z.object({
    tool: z.enum(["llm", "web_search"]),
  });
  const jsonSchema = zodToJsonSchema(toolSchema);
  return jsonSchema.definitions?.ToolSchema || jsonSchema;
}
