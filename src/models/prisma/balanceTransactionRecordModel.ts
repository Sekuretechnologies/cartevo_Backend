import { Prisma, PrismaClient } from "@prisma/client";
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";

export interface BalanceTransactionRecordModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    input: Prisma.BalanceTransactionRecordUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, data: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class BalanceTransactionRecordModel {
  static get prisma() {
    return new PrismaClient();
  }

  static async getOne(filters: FilterObject) {
    try {
      const result = await this.prisma.balanceTransactionRecord.findFirst({
        where: filters,
        include: {
          transaction: true,
        },
      });
      if (!result) {
        return fnOutput.error({
          message: "Balance transaction record not found",
          error: { message: "Balance transaction record not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching balance transaction record: " + error.message,
        error: {
          message:
            "Error fetching balance transaction record: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await this.prisma.balanceTransactionRecord.findMany({
        where: filters,
        include: {
          transaction: true,
        },
        orderBy: { created_at: "desc" },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching balance transaction records: " + error.message,
        error: {
          message:
            "Error fetching balance transaction records: " + error.message,
        },
      });
    }
  }

  static async create(
    input: Prisma.BalanceTransactionRecordUncheckedCreateInput
  ) {
    try {
      const record = await this.prisma.balanceTransactionRecord.create({
        data: input,
      });
      return fnOutput.success({ code: 201, output: record });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating balance transaction record: " + error.message,
        error: {
          message:
            "Error creating balance transaction record: " + error.message,
        },
      });
    }
  }

  static async update(identifier: string | any, data: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.BalanceTransactionRecordWhereUniqueInput;

      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedRecord = await this.prisma.balanceTransactionRecord.update({
        where,
        data,
      });
      return fnOutput.success({ code: 204, output: updatedRecord });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating balance transaction record: " + error.message,
        error: {
          message:
            "Error updating balance transaction record: " + error.message,
        },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.BalanceTransactionRecordWhereUniqueInput;

      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const deletedRecord = await this.prisma.balanceTransactionRecord.delete({
        where,
      });
      return fnOutput.success({ output: deletedRecord });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting balance transaction record: " + error.message,
        error: {
          message:
            "Error deleting balance transaction record: " + error.message,
        },
      });
    }
  }

  /**
   * Get balance transaction records by transaction ID
   */
  static async getByTransactionId(transactionId: string) {
    return this.get({ transaction_id: transactionId });
  }

  /**
   * Get balance transaction records by entity (wallet or card)
   */
  static async getByEntity(entityType: string, entityId: string) {
    return this.get({
      entity_type: entityType,
      entity_id: entityId,
    });
  }

  /**
   * This method allows for transactional operations.
   */
  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      const prismaService = require("@/modules/prisma/prisma.service");
      return await prismaService.prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default BalanceTransactionRecordModel;
