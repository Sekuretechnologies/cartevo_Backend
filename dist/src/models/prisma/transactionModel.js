"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class TransactionModel {
    static async getOne(filters) {
        try {
            const result = await prisma.transaction.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Transaction not found",
                    error: { message: "Transaction not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching transaction: " + error.message,
                error: { message: "Error fetching transaction: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.transaction.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching transactions: " + error.message,
                error: { message: "Error fetching transactions: " + error.message },
            });
        }
    }
    static async create(inputTransaction) {
        try {
            const transaction = await prisma.transaction.create({
                data: inputTransaction,
            });
            return fnOutputHandler_1.default.success({ code: 201, output: transaction });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating transaction: " + error.message,
                error: { message: "Error creating transaction: " + error.message },
            });
        }
    }
    static async update(identifier, transactionData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedTransaction = await prisma.transaction.update({
                where,
                data: transactionData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedTransaction });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating transaction: " + error.message,
                error: { message: "Error updating transaction: " + error.message },
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
            const deletedTransaction = await prisma.transaction.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedTransaction });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting transaction: " + error.message,
                error: { message: "Error deleting transaction: " + error.message },
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
exports.default = TransactionModel;
//# sourceMappingURL=transactionModel.js.map