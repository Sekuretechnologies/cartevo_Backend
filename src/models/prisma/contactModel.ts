import fnOutput from "@/utils/shared/fnOutputHandler";
import { helpRequestStatus, Prisma, PrismaClient } from "@prisma/client";
// src/models/prisma/contactModel.ts
import { FilterObject, IncludeObject } from "@/types";

import { buildPrismaQuery } from "prisma/functions";
import { setMethodFilter } from "@/utils/shared/common";

interface FilterObjectCt {
  status?: "PENDING" | "RESOLVED";
  state?: "ACTIVE" | "INACTIVE";
}

export interface HelpRequestModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  update(identifier: string | any, helpRequestData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

const prisma = new PrismaClient();

class ContactModel {
  static async getMyMessage(email: string, filters?: FilterObjectCt) {
    try {
      const result = await prisma.helpRequest.findMany({
        where: {
          email, // email obligatoire
          ...(filters?.status && { status: filters.status }),
          ...(filters?.state && { state: filters.state }),
        },
        orderBy: {
          createAt: "desc",
        },
      });

      return fnOutput.success({ output: result });
    } catch (err: any) {
      return fnOutput.error({
        message: "Error fetching help request: " + err.message,
        error: { message: "Error fetching help request: " + err.message },
      });
    }
  }

  static async getOne(filters: FilterObject, include: IncludeObject = {}) {
    try {
      const { where, include: includeObj } = buildPrismaQuery({
        filters,
        include,
      });
      const result = await prisma.helpRequest.findUnique({
        where,
        ...(includeObj ? { include: includeObj } : {}),
      });
      if (!result) {
        return fnOutput.error({
          message: "Help request not found",
          error: { message: "Help request not found" },
        });
      }
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching help request: " + error.message,
        error: { message: "Error fetching help request: " + error.message },
      });
    }
  }

  static async getAllMessages(filters?: FilterObject) {
    try {
      const result = await prisma.helpRequest.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching help requests: " + error.message,
        error: { message: "Error fetching help requests: " + error.message },
      });
    }
  }

  static async createMessage(
    inputHelpRequest: Prisma.helpRequestUncheckedCreateInput
  ) {
    try {
      const helpRequest = await prisma.helpRequest.create({
        data: { ...inputHelpRequest },
      });

      return fnOutput.success({
        code: 201,
        output: helpRequest,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating help request: " + error.message,
        error: { message: "Error creating help request: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, helpRequestData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.helpRequestWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedHelpRequestData: Prisma.helpRequestUncheckedUpdateInput = {
        ...helpRequestData,
      };
      const updatedHelpRequest = await prisma.helpRequest.update({
        where,
        data: updatedHelpRequestData,
      });
      return fnOutput.success({
        code: 204,
        output: updatedHelpRequest,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating help request: " + error.message,
        error: { message: "Error updating help request: " + error.message },
      });
    }
  }

  static async deleteMessage(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const data = { [key]: value } as Prisma.helpRequestWhereUniqueInput;
      if (!data[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedHelpRequest = await prisma.helpRequest.update({
        where: data,
        data: { state: "INACTIVE" },
      });
      return fnOutput.success({
        output: deletedHelpRequest,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting help request: " + error.message,
        error: { message: "Error deleting help request: " + error.message },
      });
    }
  }

  static async count(filters: FilterObject) {
    try {
      const count = await prisma.helpRequest.count({ where: filters });
      return fnOutput.success({
        output: count,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error counting help requests: " + error.message,
        error: { message: "Error counting help requests: " + error.message },
      });
    }
  }
}

export default ContactModel;
