"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class TransactionFeeModel {
    static async getOne(filters) {
        try {
            const result = await prisma.transactionFee.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Transaction fee not found",
                    error: { message: "Transaction fee not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching transaction fee: " + error.message,
                error: { message: "Error fetching transaction fee: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.transactionFee.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching transaction fees: " + error.message,
                error: { message: "Error fetching transaction fees: " + error.message },
            });
        }
    }
    static async create(inputTransactionFee) {
        try {
            const transactionFeeData = { ...inputTransactionFee };
            if (inputTransactionFee.transaction_type) {
                transactionFeeData.transaction_type = (0, common_1.sanitizeTextInput)(inputTransactionFee.transaction_type.toUpperCase());
            }
            if (inputTransactionFee.transaction_category) {
                transactionFeeData.transaction_category = (0, common_1.sanitizeTextInput)(inputTransactionFee.transaction_category.toUpperCase());
            }
            if (inputTransactionFee.country_iso_code) {
                transactionFeeData.country_iso_code = (0, common_1.sanitizeTextInput)(inputTransactionFee.country_iso_code.toUpperCase());
            }
            if (inputTransactionFee.currency) {
                transactionFeeData.currency = (0, common_1.sanitizeTextInput)(inputTransactionFee.currency.toUpperCase());
            }
            if (inputTransactionFee.description) {
                transactionFeeData.description = (0, common_1.sanitizeTextInput)(inputTransactionFee.description);
            }
            const transactionFee = await prisma.transactionFee.create({
                data: transactionFeeData,
            });
            return fnOutputHandler_1.default.success({ code: 201, output: transactionFee });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating transaction fee: " + error.message,
                error: { message: "Error creating transaction fee: " + error.message },
            });
        }
    }
    static async update(identifier, transactionFeeData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedTransactionFeeData = {
                ...transactionFeeData,
            };
            if (transactionFeeData.transaction_type) {
                updatedTransactionFeeData.transaction_type = (0, common_1.sanitizeTextInput)(transactionFeeData.transaction_type.toUpperCase());
            }
            if (transactionFeeData.transaction_category) {
                updatedTransactionFeeData.transaction_category = (0, common_1.sanitizeTextInput)(transactionFeeData.transaction_category.toUpperCase());
            }
            if (transactionFeeData.country_iso_code) {
                updatedTransactionFeeData.country_iso_code = (0, common_1.sanitizeTextInput)(transactionFeeData.country_iso_code.toUpperCase());
            }
            if (transactionFeeData.currency) {
                updatedTransactionFeeData.currency = (0, common_1.sanitizeTextInput)(transactionFeeData.currency.toUpperCase());
            }
            if (transactionFeeData.description) {
                updatedTransactionFeeData.description = (0, common_1.sanitizeTextInput)(transactionFeeData.description);
            }
            const updatedTransactionFee = await prisma.transactionFee.update({
                where,
                data: updatedTransactionFeeData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedTransactionFee });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating transaction fee: " + error.message,
                error: { message: "Error updating transaction fee: " + error.message },
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
            const deletedTransactionFee = await prisma.transactionFee.delete({
                where,
            });
            return fnOutputHandler_1.default.success({ output: deletedTransactionFee });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting transaction fee: " + error.message,
                error: { message: "Error deleting transaction fee: " + error.message },
            });
        }
    }
    static async getTransactionFee(companyId, transactionType, transactionCategory, countryIsoCode, currency) {
        try {
            const result = await prisma.transactionFee.findFirst({
                where: {
                    company_id: companyId,
                    transaction_type: transactionType.toUpperCase(),
                    transaction_category: transactionCategory.toUpperCase(),
                    country_iso_code: countryIsoCode.toUpperCase(),
                    currency: currency.toUpperCase(),
                    active: true,
                },
            });
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: `Transaction fee not found for ${transactionType} - ${transactionCategory} in ${countryIsoCode} (${currency})`,
                    error: {
                        message: `Transaction fee not found for ${transactionType} - ${transactionCategory} in ${countryIsoCode} (${currency})`,
                    },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching transaction fee: " + error.message,
                error: { message: "Error fetching transaction fee: " + error.message },
            });
        }
    }
    static async calculateFee(companyId, amount, transactionType, transactionCategory, countryIsoCode, currency) {
        try {
            const feeResult = await this.getTransactionFee(companyId, transactionType, transactionCategory, countryIsoCode, currency);
            if (feeResult.error) {
                return feeResult;
            }
            const fee = feeResult.output;
            let calculatedFee = 0;
            if (fee.type === "FIXED") {
                calculatedFee = parseFloat(fee.value.toString());
            }
            else if (fee.type === "PERCENTAGE") {
                calculatedFee = (amount * parseFloat(fee.value.toString())) / 100;
            }
            if (fee.fee_fixed) {
                calculatedFee += parseFloat(fee.fee_fixed.toString());
            }
            return fnOutputHandler_1.default.success({
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
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error calculating transaction fee: " + error.message,
                error: {
                    message: "Error calculating transaction fee: " + error.message,
                },
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
exports.default = TransactionFeeModel;
//# sourceMappingURL=transactionFeeModel.js.map