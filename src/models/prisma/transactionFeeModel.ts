// src/models/prisma/transactionFeeModel.ts
import { FilterObject } from "@/types";
import { sanitizeTextInput, setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface TransactionFeeModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputTransactionFee: Prisma.TransactionFeeUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, transactionFeeData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class TransactionFeeModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.transactionFee.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Transaction fee not found",
          error: { message: "Transaction fee not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching transaction fee: " + error.message,
        error: { message: "Error fetching transaction fee: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.transactionFee.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching transaction fees: " + error.message,
        error: { message: "Error fetching transaction fees: " + error.message },
      });
    }
  }

  static async create(
    inputTransactionFee: Prisma.TransactionFeeUncheckedCreateInput
  ) {
    try {
      const transactionFeeData = { ...inputTransactionFee };
      if (inputTransactionFee.transaction_type) {
        transactionFeeData.transaction_type = sanitizeTextInput(
          inputTransactionFee.transaction_type.toUpperCase()
        );
      }
      if (inputTransactionFee.transaction_category) {
        transactionFeeData.transaction_category = sanitizeTextInput(
          inputTransactionFee.transaction_category.toUpperCase()
        );
      }
      if (inputTransactionFee.country_iso_code) {
        transactionFeeData.country_iso_code = sanitizeTextInput(
          inputTransactionFee.country_iso_code.toUpperCase()
        );
      }
      if (inputTransactionFee.currency) {
        transactionFeeData.currency = sanitizeTextInput(
          inputTransactionFee.currency.toUpperCase()
        );
      }
      // if (inputTransactionFee.description) {
      //   transactionFeeData.description = sanitizeTextInput(
      //     inputTransactionFee.description
      //   );
      // }

      const transactionFee = await prisma.transactionFee.create({
        data: transactionFeeData,
      });
      return fnOutput.success({ code: 201, output: transactionFee });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating transaction fee: " + error.message,
        error: { message: "Error creating transaction fee: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, transactionFeeData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.TransactionFeeWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedTransactionFeeData: Prisma.TransactionFeeUncheckedUpdateInput =
        {
          ...transactionFeeData,
        };
      if (transactionFeeData.transaction_type) {
        updatedTransactionFeeData.transaction_type = sanitizeTextInput(
          transactionFeeData.transaction_type.toUpperCase()
        );
      }
      if (transactionFeeData.transaction_category) {
        updatedTransactionFeeData.transaction_category = sanitizeTextInput(
          transactionFeeData.transaction_category.toUpperCase()
        );
      }
      if (transactionFeeData.country_iso_code) {
        updatedTransactionFeeData.country_iso_code = sanitizeTextInput(
          transactionFeeData.country_iso_code.toUpperCase()
        );
      }
      if (transactionFeeData.currency) {
        updatedTransactionFeeData.currency = sanitizeTextInput(
          transactionFeeData.currency.toUpperCase()
        );
      }
      if (transactionFeeData.description) {
        updatedTransactionFeeData.description = sanitizeTextInput(
          transactionFeeData.description
        );
      }

      const updatedTransactionFee = await prisma.transactionFee.update({
        where,
        data: updatedTransactionFeeData,
      });
      return fnOutput.success({ code: 204, output: updatedTransactionFee });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating transaction fee: " + error.message,
        error: { message: "Error updating transaction fee: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.TransactionFeeWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedTransactionFee = await prisma.transactionFee.delete({
        where,
      });
      return fnOutput.success({ output: deletedTransactionFee });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting transaction fee: " + error.message,
        error: { message: "Error deleting transaction fee: " + error.message },
      });
    }
  }

  /**
   * Get applicable transaction fee for a specific transaction
   * @param companyId Company ID
   * @param transactionType Type of transaction
   * @param transactionCategory Category of transaction
   * @param countryIsoCode Country ISO code
   * @param currency Currency
   * @returns Transaction fee if found
   */
  static async getTransactionFee(
    companyId: string,
    transactionCategory: string,
    transactionType: string,
    countryIsoCode?: string,
    currency?: string
  ) {
    console.log("getTransactionFee :: ", {
      company_id: companyId,
      transaction_type: transactionType.toUpperCase(),
      transaction_category: transactionCategory.toUpperCase(),
      country_iso_code: countryIsoCode.toUpperCase(),
      currency: currency.toUpperCase(),
    });
    const where: any = {
      company_id: companyId,
      transaction_type: transactionType.toUpperCase(),
      transaction_category: transactionCategory.toUpperCase(),
      // active: true,
    };
    if (countryIsoCode) where.country_iso_code = countryIsoCode.toUpperCase();
    if (currency) where.currency = currency.toUpperCase();

    try {
      const result = await prisma.transactionFee.findFirst({
        where,
      });

      if (!result) {
        return fnOutput.error({
          message: `Transaction fee not found for ${transactionCategory} - ${transactionType}`,
          error: {
            message: `Transaction fee not found for ${transactionCategory} - ${transactionType}`,
          },
        });
      }

      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching transaction fee: " + error.message,
        error: { message: "Error fetching transaction fee: " + error.message },
      });
    }
  }

  /**
   * Calculate fee for a transaction amount
   * @param companyId Company ID
   * @param amount Transaction amount
   * @param transactionType Type of transaction
   * @param transactionCategory Category of transaction
   * @param countryIsoCode Country ISO code
   * @param currency Currency
   * @returns Calculated fee amount
   */
  static async calculateFee(
    companyId: string,
    amount: number,
    transactionType: string,
    transactionCategory: string,
    countryIsoCode: string,
    currency: string
  ) {
    try {
      const feeResult = await this.getTransactionFee(
        companyId,
        transactionType,
        transactionCategory
        // countryIsoCode,
        // currency
      );

      console.log("feeResult --------------- :: ", feeResult);

      if (feeResult.error) {
        throw feeResult.error;
      }

      const fee = feeResult.output;
      let calculatedFee = 0;

      if (fee.type === "FIXED") {
        calculatedFee = parseFloat(fee.value.toString());
      } else if (fee.type === "PERCENTAGE") {
        calculatedFee = (amount * parseFloat(fee.value.toString())) / 100;
      }

      // Add fixed fee if specified
      if (fee.fee_fixed) {
        calculatedFee += parseFloat(fee.fee_fixed.toString());
      }

      // console.log("calculateFee  Result --------------- :: ", {
      //   feeAmount: calculatedFee,
      //   feeType: fee.type,
      //   feeValue: parseFloat(fee.value.toString()),
      //   feeFixed: fee.fee_fixed ? parseFloat(fee.fee_fixed.toString()) : 0,
      //   feePercentage: fee.fee_percentage
      //     ? parseFloat(fee.fee_percentage.toString())
      //     : 0,
      //   feeId: fee.id,
      //   description: fee.description,
      // });

      return fnOutput.success({
        output: {
          feeAmount: calculatedFee,
          feeType: fee.type,
          feeValue: parseFloat(fee.value.toString()),
          feeFixed: fee.fee_fixed ? parseFloat(fee.fee_fixed.toString()) : 0,
          feePercentage: fee.fee_percentage
            ? parseFloat(fee.fee_percentage.toString())
            : 0,
          feeId: fee.id,
          description: fee.description,
        },
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error calculating transaction fee: " + error.message,
        error: {
          message: "Error calculating transaction fee: " + error.message,
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

export default TransactionFeeModel;
