import { Prisma, PrismaClient } from "@prisma/client";
import fnOutput from "@/utils/shared/fnOutputHandler";

const prisma = new PrismaClient();

class CustomerLogsModel {
  static async getOne(filters: { [key: string]: any }) {
    try {
      const result = await prisma.customerLogs.findFirst({
        where: filters,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer log: " + error.message,
        error: { message: "Error fetching customer log: " + error.message },
      });
    }
  }

  static async create(data: Prisma.CustomerLogsUncheckedCreateInput) {
    try {
      const result = await prisma.customerLogs.create({ data });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating customer log: " + error.message,
        error: { message: "Error creating customer log: " + error.message },
      });
    }
  }

  static async update(id: any, data: any) {
    try {
      const result = await prisma.customerLogs.update({
        where: { id },
        data,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating customer log: " + error.message,
        error: { message: "Error updating customer log: " + error.message },
      });
    }
  }

  static async delete(id: any) {
    try {
      const result = await prisma.customerLogs.delete({
        where: { id },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting customer log: " + error.message,
        error: { message: "Error deleting customer log: " + error.message },
      });
    }
  }

  static async get(filters: { [key: string]: any }) {
    try {
      const result = await prisma.customerLogs.findMany({
        where: filters,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer logs: " + error.message,
        error: { message: "Error fetching customer logs: " + error.message },
      });
    }
  }

  static async getWithComplexFilters(
    whereClause: Prisma.CustomerLogsWhereInput
  ) {
    try {
      const result = await prisma.customerLogs.findMany({
        where: whereClause,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message:
          "Error fetching customer logs with complex filters: " + error.message,
        error: {
          message:
            "Error fetching customer logs with complex filters: " +
            error.message,
        },
      });
    }
  }
}

export default CustomerLogsModel;
