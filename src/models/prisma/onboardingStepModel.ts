// src/models/prisma/onboardingStepModel.ts
import { FilterObject } from "@/types";
import { sanitizeTextInput, setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient, StepStatus } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface OnboardingStepModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputStep: any): Promise<any>;
  update(identifier: string | any, stepData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
  updateStatus(id: string, status: StepStatus): Promise<any>;
  getByCompanyAndStatus(companyId: string, status: StepStatus): Promise<any>;
  getNextPendingStep(companyId: string): Promise<any>;
  initializeDefaultSteps(companyId: string): Promise<any>;
}

class OnboardingStepModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.onboardingStep.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Onboarding step not found",
          error: { message: "Onboarding step not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching onboarding step: " + error.message,
        error: { message: "Error fetching onboarding step: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.onboardingStep.findMany(
        buildPrismaQuery({ filters, order: { order: "asc" } })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching onboarding steps: " + error.message,
        error: { message: "Error fetching onboarding steps: " + error.message },
      });
    }
  }

  static async create(inputStep: any) {
    try {
      const stepData = { ...inputStep };
      if (inputStep.name) {
        stepData.name = sanitizeTextInput(inputStep.name);
      }
      if (inputStep.slug) {
        stepData.slug = sanitizeTextInput(inputStep.slug);
      }
      if (inputStep.description) {
        stepData.description = sanitizeTextInput(inputStep.description);
      }

      const step = await prisma.onboardingStep.create({ data: stepData });
      return fnOutput.success({ code: 201, output: step });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating onboarding step: " + error.message,
        error: { message: "Error creating onboarding step: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, stepData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as any;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedStepData: any = {
        ...stepData,
        updated_at: new Date(),
      };

      if (stepData.name) {
        updatedStepData.name = sanitizeTextInput(stepData.name);
      }
      if (stepData.slug) {
        updatedStepData.slug = sanitizeTextInput(stepData.slug);
      }
      if (stepData.description) {
        updatedStepData.description = sanitizeTextInput(stepData.description);
      }

      const updatedStep = await prisma.onboardingStep.update({
        where,
        data: updatedStepData,
      });
      return fnOutput.success({ code: 204, output: updatedStep });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating onboarding step: " + error.message,
        error: { message: "Error updating onboarding step: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as any;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const deletedStep = await prisma.onboardingStep.delete({ where });
      return fnOutput.success({ output: deletedStep });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting onboarding step: " + error.message,
        error: { message: "Error deleting onboarding step: " + error.message },
      });
    }
  }

  static async updateStatus(id: string, status: StepStatus) {
    try {
      const updatedStep = await prisma.onboardingStep.update({
        where: { id },
        data: {
          status,
          updated_at: new Date(),
        },
      });
      return fnOutput.success({ output: updatedStep });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating step status: " + error.message,
        error: { message: "Error updating step status: " + error.message },
      });
    }
  }

  static async getByCompanyAndStatus(companyId: string, status: StepStatus) {
    try {
      const result = await prisma.onboardingStep.findMany({
        where: {
          company_id: companyId,
          status,
        },
        orderBy: { order: "asc" },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching steps by company and status: " + error.message,
        error: {
          message:
            "Error fetching steps by company and status: " + error.message,
        },
      });
    }
  }

  static async getNextPendingStep(companyId: string) {
    try {
      const result = await prisma.onboardingStep.findFirst({
        where: {
          company_id: companyId,
          status: StepStatus.PENDING,
        },
        orderBy: { order: "asc" },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching next pending step: " + error.message,
        error: {
          message: "Error fetching next pending step: " + error.message,
        },
      });
    }
  }

  static async startStep(id: string) {
    try {
      const result = await prisma.onboardingStep.update({
        where: { id },
        data: {
          status: StepStatus.IN_PROGRESS,
          updated_at: new Date(),
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error starting step: " + error.message,
        error: { message: "Error starting step: " + error.message },
      });
    }
  }

  static async completeStep(id: string) {
    try {
      const result = await prisma.onboardingStep.update({
        where: { id },
        data: {
          status: StepStatus.COMPLETED,
          updated_at: new Date(),
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error completing step: " + error.message,
        error: { message: "Error completing step: " + error.message },
      });
    }
  }

  static async resetCompanySteps(companyId: string) {
    try {
      const result = await prisma.onboardingStep.updateMany({
        where: { company_id: companyId },
        data: {
          status: StepStatus.PENDING,
          updated_at: new Date(),
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error resetting company steps: " + error.message,
        error: { message: "Error resetting company steps: " + error.message },
      });
    }
  }

  static async initializeDefaultSteps(companyId: string) {
    try {
      // Check if steps already exist for this company
      const existingSteps = await prisma.onboardingStep.findMany({
        where: { company_id: companyId },
      });

      if (existingSteps.length > 0) {
        return fnOutput.error({
          message: "Default steps already exist for this company",
          error: { message: "Default steps already exist for this company" },
        });
      }

      const defaultSteps = [
        {
          name: "Profile",
          slug: "profile_completion",
          order: 1,
          description: "Complete user profile",
        },
        {
          name: "Business details",
          slug: "kyb_completion",
          order: 2,
          description: "Complete business details and KYB",
        },
        // {
        //   name: "Personal Information",
        //   slug: "personal_info",
        //   order: 1,
        //   description: "Complete personal information and KYC",
        // },

        // {
        //   name: "Banking Information",
        //   slug: "banking_info",
        //   order: 3,
        //   description: "Add banking details",
        // },

        // {
        //   name: "Onboarding Complete",
        //   slug: "onboarding_complete",
        //   order: 5,
        //   description: "Finalize onboarding process",
        // },
      ];

      const createdSteps = await Promise.all(
        defaultSteps.map(async (step) => {
          return await prisma.onboardingStep.create({
            data: {
              company_id: companyId,
              name: step.name,
              slug: step.slug,
              order: step.order,
              description: step.description,
              status: StepStatus.PENDING,
            },
          });
        })
      );

      return fnOutput.success({ code: 201, output: createdSteps });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error initializing default steps: " + error.message,
        error: {
          message: "Error initializing default steps: " + error.message,
        },
      });
    }
  }

  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      const prisma = require("@/modules/prisma/prisma.service").prisma;
      return await prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default OnboardingStepModel;
