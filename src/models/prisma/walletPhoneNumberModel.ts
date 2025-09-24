// src/models/prisma/walletPhoneNumberModel.ts
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface WalletPhoneNumberModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputData: Prisma.WalletPhoneNumberUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, data: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class WalletPhoneNumberModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.walletPhoneNumber.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Wallet phone number not found",
          error: { message: "Wallet phone number not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallet phone number: " + error.message,
        error: {
          message: "Error fetching wallet phone number: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.walletPhoneNumber.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallet phone numbers: " + error.message,
        error: {
          message: "Error fetching wallet phone numbers: " + error.message,
        },
      });
    }
  }

  static async create(inputData: Prisma.WalletPhoneNumberUncheckedCreateInput) {
    try {
      const walletPhoneNumber = await prisma.walletPhoneNumber.create({
        data: inputData,
      });
      return fnOutput.success({ code: 201, output: walletPhoneNumber });
    } catch (error: any) {
      // Map unique constraint violation to a clearer error
      const message =
        error?.code === "P2002"
          ? "This phone number already exists for this wallet."
          : "Error creating wallet phone number: " + error.message;
      return fnOutput.error({
        message,
        error: {
          message,
        },
      });
    }
  }

  static async update(identifier: string | any, data: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.WalletPhoneNumberWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedWalletPhoneNumber = await prisma.walletPhoneNumber.update({
        where,
        data,
      });
      return fnOutput.success({ code: 204, output: updatedWalletPhoneNumber });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating wallet phone number: " + error.message,
        error: {
          message: "Error updating wallet phone number: " + error.message,
        },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.WalletPhoneNumberWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedWalletPhoneNumber = await prisma.walletPhoneNumber.delete({
        where,
      });
      return fnOutput.success({ output: deletedWalletPhoneNumber });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting wallet phone number: " + error.message,
        error: {
          message: "Error deleting wallet phone number: " + error.message,
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

export default WalletPhoneNumberModel;
