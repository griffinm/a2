import { Ollama } from "@/Ollama";
import { Config } from "../Config";
import { DB } from "../DB";
import { Query, Step, StepType, TaskStatus, Tool } from "../generated/prisma";
import { Logger } from "../Logger";
import { getLlmStepPrompt, getLlmStepPromptFormat, getStepPrompt, getStepPromptFormat, getToolPrompt, getToolPromptFormat } from "./promptUtils";
import { JsonObject } from "@prisma/client/runtime/library";
import z from "zod";
import { JsonGetValueTool } from "langchain/tools";

export class ResearchService {
  private db: DB;
  private config: Config;
  private logger: Logger;
  private queryId: string | null = null;
  private ollama: Ollama;
  private query: Query | null = null;

  constructor({ 
    db,
    config,
    ollama,
  }: {
    db: DB;
    config: Config;
    ollama: Ollama;
  }) {
    this.db = db;
    this.config = config;
    this.logger = new Logger("ResearchService");
    this.ollama = ollama;
  }

  public async startResearch({
    query,
  }: {
    query: string;
  }) {
    const q = await this.db.getClient().query.create({
      data: { 
        value: query,
        status: TaskStatus.PENDING,
        startedAt: new Date(),
      },
    });
    this.query = q;
    this.queryId = q.id;
    this.logger.info(`Starting research for query: ${this.queryId}`);

    // Run all steps
    await this.createAndRunPlanStep();
    await this.createAndRunToolSelectionStep();
    await this.runAllSteps();
    await this.createPostPlanningSteps();
    await this.runAllSteps();

    return q;
  }

  public async createPostPlanningSteps() {
    // Find all of the tool selection steps without associated child steps
    const toolSelectionSteps = await this.db.getClient().step.findMany({
      where: {
        queryId: this.queryId!,
        stepType: StepType.TOOL_SELECTION,
        childrenSteps: {
          none: {},
        },
      },
    });
    this.logger.info(`Creating steps from planning steps. Found ${toolSelectionSteps.length} tool selection steps.`);

    // Create a new task for each tool selection step
    for (const toolSelectionStep of toolSelectionSteps) {
      const stepPrompt = getLlmStepPrompt({ currentStepText: toolSelectionStep.description, originalQuery: this.query?.value || "" });
      const lastStepNumber = await this.db.getClient().step.findFirst({
        where: { queryId: this.queryId! },
        orderBy: { stepNumber: "desc" },
        select: { stepNumber: true },
      });

      await this.db.getClient().step.create({
        data: {
          queryId: this.queryId!,
          tool: Tool.LLM,
          description: stepPrompt,
          parentStepId: toolSelectionStep.id,
          status: TaskStatus.PENDING,
          stepType: toolSelectionStep.tool === Tool.LLM ? StepType.LLM : StepType.WEB_SEARCH,
          stepNumber: lastStepNumber?.stepNumber ? lastStepNumber.stepNumber + 1 : 1,
        },
      });
    }

    this.logger.info(`Created ${toolSelectionSteps.length} steps from planning steps.`);
  }

  private async createAndRunToolSelectionStep() {
    this.logger.info(`Creating and running tool selection step for query ${this.queryId}`);
    if (!this.queryId) {
      throw new Error("Query ID is not set");
    }

    let currentStepIndex = await this.db.getClient().step.count({
      where: {
        queryId: this.queryId,
      },
    });

    const planningResult = await this.db.getClient().step.findFirst({
      where: {
        queryId: this.queryId,
        stepNumber: {
          equals: 1,
        },
      },
    });

    const stepDescriptions = JSON.parse(planningResult?.response || "[]") as { steps: { stepNumber: number, stepInstruction: string }[] };
    const steps = stepDescriptions.steps.map((stepDescription) => stepDescription.stepInstruction);

    for (const step of steps) {
      const stepPrompt = getToolPrompt({ stepText: step, originalQuery: this.query?.value || "" });
      await this.db.getClient().step.create({
        data: {
          queryId: this.queryId!,
          tool: Tool.LLM,
          description: stepPrompt,
          startedAt: new Date(),
          status: TaskStatus.PENDING,
          stepType: StepType.TOOL_SELECTION,
          stepNumber: currentStepIndex + 1,
          outputSchema: getToolPromptFormat() as any,
          parentStepId: planningResult?.id,
        },
      });
      currentStepIndex = currentStepIndex + 1;
    }
    
  }

  private async createAndRunPlanStep() {
    if (!this.queryId) {
      throw new Error("Query ID is not set");
    }

    const firstStep = await this.db.getClient().step.create({
      data: {
        queryId: this.queryId,
        tool: Tool.LLM,
        description: getStepPrompt({ query: this.query?.value || "" }),
        startedAt: new Date(),
        status: TaskStatus.PENDING,
        stepType: StepType.PLANNING,
        stepNumber: 1,
        outputSchema: getStepPromptFormat() as any,
      },
    });
    await this.runStep({ step: firstStep });
  }

  private async runAllSteps() {
    if (!this.queryId) {
      throw new Error("Query ID is not set");
    }

    this.logger.info(`Running all steps for query ${this.queryId}`);
    let currentStep: Step | null = null;
    do {
      currentStep = await this.getNextStep();
      this.logger.info(`Running step ${currentStep?.stepNumber} for query ${this.queryId}`);
      if (!currentStep) {
        break;
      }

      const response = await this.runStep({ step: currentStep });

      this.logger.info(`Step ${currentStep.stepNumber} completed`);
      currentStep = await this.getNextStep();
    } while (currentStep);

    this.logger.info(`All steps completed for query ${this.queryId}`);
    await this.db.getClient().query.update({
      where: { id: this.queryId },
      data: {
        status: TaskStatus.COMPLETED,
      },
    });
  }

  private async runStep({ step }: { step: Step }): Promise<Step> {
    // Update the step to running
    await this.db.getClient().step.update({
      where: { id: step.id },
      data: { status: TaskStatus.RUNNING, startedAt: new Date() },
    });

    if (step.tool === Tool.LLM) {
      let format: JsonObject | undefined = undefined;
      if (step.outputSchema && typeof step.outputSchema === "object" && !Array.isArray(step.outputSchema)) {
        format = step.outputSchema as JsonObject;
      }
      const response = await this.ollama.generateCompletion({
        prompt: step.description,
        format,
      });

      // Mark the step as completed
      const updatedStep =  await this.db.getClient().step.update({
        where: { id: step.id },
        data: {
          response,
          status: TaskStatus.COMPLETED,
          endedAt: new Date(),
        },
      });

      return updatedStep;
    } else if (step.tool === Tool.WEB_SEARCH) {
      this.logger.error(`Web search for step ${step.stepNumber} is not implemented`);
    } else {
      throw new Error(`Unknown tool: ${step.tool}`);
    }

    return step;
  }

  private async getNextStep(): Promise<Step | null> {
    if (!this.queryId) {
      throw new Error("Query ID is not set");
    }

    const step = await this.db.getClient().step.findFirst({
      where: {
        queryId: this.queryId,
        status: TaskStatus.PENDING,
      },
      orderBy: {
        stepNumber: "asc",
      },
    });

    return step;
  }
}