// src/models/prisma/roleModel.ts
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface RoleModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputRole: Prisma.RoleUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, roleData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class RoleModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.role.findFirst(buildPrismaQuery({ filters }));
      if (!result) {
        return fnOutput.error({
          message: "Role not found",
          error: { message: "Role not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching role: " + error.message,
        error: { message: "Error fetching role: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.role.findMany(buildPrismaQuery({ filters }));
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching roles: " + error.message,
        error: { message: "Error fetching roles: " + error.message },
      });
    }
  }

  static async create(inputRole: Prisma.RoleUncheckedCreateInput) {
    try {
      const role = await prisma.role.create({ data: inputRole });
      return fnOutput.success({ code: 201, output: role });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating role: " + error.message,
        error: { message: "Error creating role: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, roleData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.RoleWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedRole = await prisma.role.update({ where, data: roleData });
      return fnOutput.success({ code: 204, output: updatedRole });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating role: " + error.message,
        error: { message: "Error updating role: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.RoleWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedRole = await prisma.role.delete({ where });
      return fnOutput.success({ output: deletedRole });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting role: " + error.message,
        error: { message: "Error deleting role: " + error.message },
      });
    }
  }
}

export default RoleModel;
