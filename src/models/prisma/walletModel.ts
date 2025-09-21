// src/models/prisma/walletModel.ts
import { FilterObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface WalletModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputWallet: Prisma.WalletUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, walletData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class WalletModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.wallet.findFirst({
        where: filters,
        include: {
          phoneNumbers: true,
        },
      });
      if (!result) {
        return fnOutput.error({
          message: "Wallet not found",
          error: { message: "Wallet not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallet: " + error.message,
        error: { message: "Error fetching wallet: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.wallet.findMany({
        where: filters,
        include: {
          phoneNumbers: true,
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching wallets: " + error.message,
        error: { message: "Error fetching wallets: " + error.message },
      });
    }
  }

  static async create(inputWallet: Prisma.WalletUncheckedCreateInput) {
    try {
      const wallet = await prisma.wallet.create({ data: inputWallet });
      return fnOutput.success({ code: 201, output: wallet });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating wallet: " + error.message,
        error: { message: "Error creating wallet: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, walletData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.WalletWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedWallet = await prisma.wallet.update({
        where,
        data: walletData,
      });
      return fnOutput.success({ code: 204, output: updatedWallet });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating wallet: " + error.message,
        error: { message: "Error updating wallet: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.WalletWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedWallet = await prisma.wallet.delete({ where });
      return fnOutput.success({ output: deletedWallet });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting wallet: " + error.message,
        error: { message: "Error deleting wallet: " + error.message },
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

export default WalletModel;
