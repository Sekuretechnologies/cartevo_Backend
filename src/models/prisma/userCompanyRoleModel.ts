// src/models/prisma/userCompanyRoleModel.ts
import { FilterObject } from "@/types";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface UserCompanyRoleModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(input: Prisma.UserCompanyRoleUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, data: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class UserCompanyRoleModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.userCompanyRole.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "UserCompanyRole not found",
          error: { message: "UserCompanyRole not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching userCompanyRole: " + error.message,
        error: { message: "Error fetching userCompanyRole: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.userCompanyRole.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching userCompanyRoles: " + error.message,
        error: { message: "Error fetching userCompanyRoles: " + error.message },
      });
    }
  }

  static async create(input: Prisma.UserCompanyRoleUncheckedCreateInput) {
    try {
      const created = await prisma.userCompanyRole.create({ data: input });
      return fnOutput.success({ code: 201, output: created });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating userCompanyRole: " + error.message,
        error: { message: "Error creating userCompanyRole: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, data: any) {
    try {
      const where =
        typeof identifier === "string" ? { id: identifier } : identifier;
      const updated = await prisma.userCompanyRole.update({ where, data });
      return fnOutput.success({ code: 204, output: updated });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating userCompanyRole: " + error.message,
        error: { message: "Error updating userCompanyRole: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const where =
        typeof identifier === "string" ? { id: identifier } : identifier;
      const deleted = await prisma.userCompanyRole.delete({ where });
      return fnOutput.success({ output: deleted });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting userCompanyRole: " + error.message,
        error: { message: "Error deleting userCompanyRole: " + error.message },
      });
    }
  }

  static async count(filters: FilterObject): Promise<number> {
    try {
      const count = await prisma.userCompanyRole.count({ where: filters });
      return count;
    } catch (error) {
      throw new Error(
        `Failed to count UserCompanyRole records: ${error.message}`
      );
    }
  }
}

export default UserCompanyRoleModel;
