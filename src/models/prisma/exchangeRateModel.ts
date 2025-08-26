// src/models/prisma/exchangeRateModel.ts
import { FilterObject } from "@/types";
import { sanitizeTextInput, setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface ExchangeRateModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputExchangeRate: Prisma.ExchangeRateUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, exchangeRateData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class ExchangeRateModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.exchangeRate.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Exchange rate not found",
          error: { message: "Exchange rate not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching exchange rate: " + error.message,
        error: { message: "Error fetching exchange rate: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.exchangeRate.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching exchange rates: " + error.message,
        error: { message: "Error fetching exchange rates: " + error.message },
      });
    }
  }

  static async create(
    inputExchangeRate: Prisma.ExchangeRateUncheckedCreateInput
  ) {
    try {
      const exchangeRateData = { ...inputExchangeRate };
      if (inputExchangeRate.from_currency) {
        exchangeRateData.from_currency = sanitizeTextInput(
          inputExchangeRate.from_currency.toUpperCase()
        );
      }
      if (inputExchangeRate.to_currency) {
        exchangeRateData.to_currency = sanitizeTextInput(
          inputExchangeRate.to_currency.toUpperCase()
        );
      }
      if (inputExchangeRate.source) {
        exchangeRateData.source = sanitizeTextInput(inputExchangeRate.source);
      }
      if (inputExchangeRate.description) {
        exchangeRateData.description = sanitizeTextInput(
          inputExchangeRate.description
        );
      }

      const exchangeRate = await prisma.exchangeRate.create({
        data: exchangeRateData,
      });
      return fnOutput.success({ code: 201, output: exchangeRate });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating exchange rate: " + error.message,
        error: { message: "Error creating exchange rate: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, exchangeRateData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.ExchangeRateWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedExchangeRateData: Prisma.ExchangeRateUncheckedUpdateInput = {
        ...exchangeRateData,
      };
      if (exchangeRateData.from_currency) {
        updatedExchangeRateData.from_currency = sanitizeTextInput(
          exchangeRateData.from_currency.toUpperCase()
        );
      }
      if (exchangeRateData.to_currency) {
        updatedExchangeRateData.to_currency = sanitizeTextInput(
          exchangeRateData.to_currency.toUpperCase()
        );
      }
      if (exchangeRateData.source) {
        updatedExchangeRateData.source = sanitizeTextInput(
          exchangeRateData.source
        );
      }
      if (exchangeRateData.description) {
        updatedExchangeRateData.description = sanitizeTextInput(
          exchangeRateData.description
        );
      }

      const updatedExchangeRate = await prisma.exchangeRate.update({
        where,
        data: updatedExchangeRateData,
      });
      return fnOutput.success({ code: 204, output: updatedExchangeRate });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating exchange rate: " + error.message,
        error: { message: "Error updating exchange rate: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.ExchangeRateWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedExchangeRate = await prisma.exchangeRate.delete({ where });
      return fnOutput.success({ output: deletedExchangeRate });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting exchange rate: " + error.message,
        error: { message: "Error deleting exchange rate: " + error.message },
      });
    }
  }

  /**
   * Get exchange rate for currency conversion
   * @param companyId Company ID
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Exchange rate if found
   */
  static async getExchangeRate(
    companyId: string,
    fromCurrency: string,
    toCurrency: string
  ) {
    try {
      const result = await prisma.exchangeRate.findFirst({
        where: {
          company_id: companyId,
          from_currency: fromCurrency.toUpperCase(),
          to_currency: toCurrency.toUpperCase(),
          is_active: true,
        },
      });

      if (!result) {
        return fnOutput.error({
          message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`,
          error: {
            message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`,
          },
        });
      }

      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching exchange rate: " + error.message,
        error: { message: "Error fetching exchange rate: " + error.message },
      });
    }
  }

  /**
   * Convert amount using company's exchange rate
   * @param companyId Company ID
   * @param amount Amount to convert
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Converted amount
   */
  static async convertCurrency(
    companyId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) {
    try {
      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return fnOutput.success({
          output: { convertedAmount: amount, rate: 1 },
        });
      }

      const exchangeRateResult = await this.getExchangeRate(
        companyId,
        fromCurrency,
        toCurrency
      );
      if (exchangeRateResult.error) {
        return exchangeRateResult;
      }

      const exchangeRate = exchangeRateResult.output;
      const convertedAmount = amount * parseFloat(exchangeRate.rate.toString());

      return fnOutput.success({
        output: {
          convertedAmount,
          rate: parseFloat(exchangeRate.rate.toString()),
          exchangeRateId: exchangeRate.id,
        },
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error converting currency: " + error.message,
        error: { message: "Error converting currency: " + error.message },
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

export default ExchangeRateModel;
