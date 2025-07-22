import { Ollama } from "@/Ollama";
import { Config } from "../Config";
import { DB } from "../DB";
import { Query, Step, StepType, TaskStatus, Tool } from "../generated/prisma";
import { Logger } from "../Logger";
import { getStepPrompt, getStepPromptFormat, getToolPrompt, getToolPromptFormat } from "./promptUtils";
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

    return q;
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
          stepType: StepType.LLM,
          stepNumber: currentStepIndex + 1,
          outputSchema: getToolPromptFormat() as any,
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
        stepType: StepType.FOUNDATIONAL,
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
    await this.db.getClient().query.update({
      where: { id: this.queryId },
      data: {
        status: TaskStatus.RUNNING,
        startedAt: new Date(),
      },
    });
    let currentStep: Step | null = null;
    do {
      currentStep = await this.getNextStep();
      this.logger.info(`Running step ${currentStep?.stepNumber} for query ${this.queryId}`);
      if (!currentStep) {
        break;
      }

      // Update the step to running
      await this.db.getClient().step.update({
        where: { id: currentStep.id },
        data: { status: TaskStatus.RUNNING },
      });

      const response = await this.runStep({ step: currentStep });

      // Update the step to completed
      await this.db.getClient().step.update({
        where: { id: currentStep.id },
        data: {
          response: response.response,
          status: TaskStatus.COMPLETED,
        },
      });

      this.logger.info(`Step ${currentStep.stepNumber} completed`);
      currentStep = await this.getNextStep();
    } while (currentStep);

    this.logger.info(`All steps completed for query ${this.queryId}`);
    await this.db.getClient().query.update({
      where: { id: this.queryId },
      data: {
        status: TaskStatus.COMPLETED,
        endedAt: new Date(),
      },
    });
  }

  private async runStep({ step }: { step: Step }): Promise<Step> {
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
      return await this.db.getClient().step.update({
        where: { id: step.id },
        data: {
          response,
          status: TaskStatus.COMPLETED,
          endedAt: new Date(),
        },
      });
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