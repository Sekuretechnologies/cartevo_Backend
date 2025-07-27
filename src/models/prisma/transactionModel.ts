// src/models/prisma/transactionModel.ts
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface TransactionModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputTransaction: Prisma.TransactionUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, transactionData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class TransactionModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.transaction.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Transaction not found",
          error: { message: "Transaction not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching transaction: " + error.message,
        error: { message: "Error fetching transaction: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.transaction.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching transactions: " + error.message,
        error: { message: "Error fetching transactions: " + error.message },
      });
    }
  }

  static async create(
    inputTransaction: Prisma.TransactionUncheckedCreateInput
  ) {
    try {
      const transaction = await prisma.transaction.create({
        data: inputTransaction,
      });
      return fnOutput.success({ code: 201, output: transaction });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating transaction: " + error.message,
        error: { message: "Error creating transaction: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, transactionData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.TransactionWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedTransaction = await prisma.transaction.update({
        where,
        data: transactionData,
      });
      return fnOutput.success({ code: 204, output: updatedTransaction });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating transaction: " + error.message,
        error: { message: "Error updating transaction: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.TransactionWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedTransaction = await prisma.transaction.delete({ where });
      return fnOutput.success({ output: deletedTransaction });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting transaction: " + error.message,
        error: { message: "Error deleting transaction: " + error.message },
      });
    }
  }

  /**
   * This method allows for transactional operations.
   * It accepts a callback function that receives the Prisma client instance.
   * The transaction ensures that if any step fails, all changes are rolled back.
   *
   * @param callback The callback function to execute within the transaction.
   * @returns The result of the callback function.
   */
  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      // Use the global prisma instance
      const prisma = require("@/modules/prisma/prisma.service").prisma;
      return await prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default TransactionModel;
