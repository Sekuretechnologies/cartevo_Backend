"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class ExchangeRateModel {
    static async getOne(filters) {
        try {
            const result = await prisma.exchangeRate.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Exchange rate not found",
                    error: { message: "Exchange rate not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching exchange rate: " + error.message,
                error: { message: "Error fetching exchange rate: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.exchangeRate.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching exchange rates: " + error.message,
                error: { message: "Error fetching exchange rates: " + error.message },
            });
        }
    }
    static async create(inputExchangeRate) {
        try {
            const exchangeRateData = { ...inputExchangeRate };
            if (inputExchangeRate.from_currency) {
                exchangeRateData.from_currency = (0, common_1.sanitizeTextInput)(inputExchangeRate.from_currency.toUpperCase());
            }
            if (inputExchangeRate.to_currency) {
                exchangeRateData.to_currency = (0, common_1.sanitizeTextInput)(inputExchangeRate.to_currency.toUpperCase());
            }
            if (inputExchangeRate.source) {
                exchangeRateData.source = (0, common_1.sanitizeTextInput)(inputExchangeRate.source);
            }
            if (inputExchangeRate.description) {
                exchangeRateData.description = (0, common_1.sanitizeTextInput)(inputExchangeRate.description);
            }
            const exchangeRate = await prisma.exchangeRate.create({
                data: exchangeRateData,
            });
            return fnOutputHandler_1.default.success({ code: 201, output: exchangeRate });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating exchange rate: " + error.message,
                error: { message: "Error creating exchange rate: " + error.message },
            });
        }
    }
    static async update(identifier, exchangeRateData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedExchangeRateData = {
                ...exchangeRateData,
            };
            if (exchangeRateData.from_currency) {
                updatedExchangeRateData.from_currency = (0, common_1.sanitizeTextInput)(exchangeRateData.from_currency.toUpperCase());
            }
            if (exchangeRateData.to_currency) {
                updatedExchangeRateData.to_currency = (0, common_1.sanitizeTextInput)(exchangeRateData.to_currency.toUpperCase());
            }
            if (exchangeRateData.source) {
                updatedExchangeRateData.source = (0, common_1.sanitizeTextInput)(exchangeRateData.source);
            }
            if (exchangeRateData.description) {
                updatedExchangeRateData.description = (0, common_1.sanitizeTextInput)(exchangeRateData.description);
            }
            const updatedExchangeRate = await prisma.exchangeRate.update({
                where,
                data: updatedExchangeRateData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedExchangeRate });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating exchange rate: " + error.message,
                error: { message: "Error updating exchange rate: " + error.message },
            });
        }
    }
    static async delete(identifier) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const deletedExchangeRate = await prisma.exchangeRate.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedExchangeRate });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting exchange rate: " + error.message,
                error: { message: "Error deleting exchange rate: " + error.message },
            });
        }
    }
    static async getExchangeRate(companyId, fromCurrency, toCurrency) {
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
                return fnOutputHandler_1.default.error({
                    message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`,
                    error: {
                        message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`,
                    },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching exchange rate: " + error.message,
                error: { message: "Error fetching exchange rate: " + error.message },
            });
        }
    }
    static async convertCurrency(companyId, amount, fromCurrency, toCurrency) {
        try {
            if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
                return fnOutputHandler_1.default.success({
                    output: { convertedAmount: amount, rate: 1 },
                });
            }
            const exchangeRateResult = await this.getExchangeRate(companyId, fromCurrency, toCurrency);
            if (exchangeRateResult.error) {
                return exchangeRateResult;
            }
            const exchangeRate = exchangeRateResult.output;
            const convertedAmount = amount * parseFloat(exchangeRate.rate.toString());
            return fnOutputHandler_1.default.success({
                output: {
                    convertedAmount,
                    rate: parseFloat(exchangeRate.rate.toString()),
                    exchangeRateId: exchangeRate.id,
                },
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error converting currency: " + error.message,
                error: { message: "Error converting currency: " + error.message },
            });
        }
    }
    static async operation(callback) {
        try {
            const prisma = require("@/modules/prisma/prisma.service").prisma;
            return await prisma.$transaction(callback);
        }
        catch (error) {
            throw new Error(`Operation failed: ${error.message}`);
        }
    }
}
exports.default = ExchangeRateModel;
//# sourceMappingURL=exchangeRateModel.js.map