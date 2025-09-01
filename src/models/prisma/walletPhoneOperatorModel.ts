// src/models/prisma/walletPhoneOperatorModel.ts
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface WalletPhoneOperatorModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputData: Prisma.WalletPhoneOperatorUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, data: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class WalletPhoneOperatorModel {
  static async getOne(filters: FilterObject) {
    try {
      const { where, orderBy } = buildPrismaQuery({ filters });
      const result = await prisma.walletPhoneOperator.findFirst({
        where,
        orderBy,
      });
      if (!result) {
        return fnOutput.error({
          message: "Wallet phone operator not found",
          error: { message: "Wallet phone operator not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallet phone operator: " + error.message,
        error: {
          message: "Error fetching wallet phone operator: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const { where, orderBy } = buildPrismaQuery({ filters });
      const result = await prisma.walletPhoneOperator.findMany({
        where,
        orderBy,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallet phone operators: " + error.message,
        error: {
          message: "Error fetching wallet phone operators: " + error.message,
        },
      });
    }
  }

  static async create(
    inputData: Prisma.WalletPhoneOperatorUncheckedCreateInput
  ) {
    try {
      const walletPhoneOperator = await prisma.walletPhoneOperator.create({
        data: inputData,
      });
      return fnOutput.success({ code: 201, output: walletPhoneOperator });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating wallet phone operator: " + error.message,
        error: {
          message: "Error creating wallet phone operator: " + error.message,
        },
      });
    }
  }

  static async update(identifier: string | any, data: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.WalletPhoneOperatorWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedWalletPhoneOperator =
        await prisma.walletPhoneOperator.update({
          where,
          data,
        });
      return fnOutput.success({
        code: 204,
        output: updatedWalletPhoneOperator,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating wallet phone operator: " + error.message,
        error: {
          message: "Error updating wallet phone operator: " + error.message,
        },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.WalletPhoneOperatorWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedWalletPhoneOperator =
        await prisma.walletPhoneOperator.delete({ where });
      return fnOutput.success({ output: deletedWalletPhoneOperator });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting wallet phone operator: " + error.message,
        error: {
          message: "Error deleting wallet phone operator: " + error.message,
        },
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

export default WalletPhoneOperatorModel;
