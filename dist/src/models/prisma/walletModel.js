"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class WalletModel {
    static async getOne(filters) {
        try {
            const result = await prisma.wallet.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Wallet not found",
                    error: { message: "Wallet not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching wallet: " + error.message,
                error: { message: "Error fetching wallet: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.wallet.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching wallets: " + error.message,
                error: { message: "Error fetching wallets: " + error.message },
            });
        }
    }
    static async create(inputWallet) {
        try {
            const wallet = await prisma.wallet.create({ data: inputWallet });
            return fnOutputHandler_1.default.success({ code: 201, output: wallet });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating wallet: " + error.message,
                error: { message: "Error creating wallet: " + error.message },
            });
        }
    }
    static async update(identifier, walletData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedWallet = await prisma.wallet.update({
                where,
                data: walletData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedWallet });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating wallet: " + error.message,
                error: { message: "Error updating wallet: " + error.message },
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
            const deletedWallet = await prisma.wallet.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedWallet });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting wallet: " + error.message,
                error: { message: "Error deleting wallet: " + error.message },
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
exports.default = WalletModel;
//# sourceMappingURL=walletModel.js.map