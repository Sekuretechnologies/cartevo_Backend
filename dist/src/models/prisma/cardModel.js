"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class CardModel {
    static async getOne(filters) {
        try {
            const result = await prisma.card.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Card not found",
                    error: { message: "Card not found" },
                });
            }
            return fnOutputHandler_1.default.success({
                output: result,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching card: " + error.message,
                error: { message: "Error fetching card: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.card.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({
                output: result,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching cards: " + error.message,
                error: { message: "Error fetching cards: " + error.message },
            });
        }
    }
    static async create(inputCard) {
        try {
            const cardData = { ...inputCard };
            const card = await prisma.card.create({
                data: cardData,
            });
            return fnOutputHandler_1.default.success({
                code: 201,
                output: card,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating card: " + error.message,
                error: { message: "Error creating card: " + error.message },
            });
        }
    }
    static async update(identifier, cardData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedCardData = { ...cardData };
            const updatedCard = await prisma.card.update({
                where,
                data: updatedCardData,
            });
            return fnOutputHandler_1.default.success({
                code: 204,
                output: updatedCard,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating card: " + error.message,
                error: { message: "Error updating card: " + error.message },
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
            const deletedCard = await prisma.card.delete({
                where,
            });
            return fnOutputHandler_1.default.success({
                output: deletedCard,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting card: " + error.message,
                error: { message: "Error deleting card: " + error.message },
            });
        }
    }
    static async count(filters) {
        try {
            const count = await prisma.card.count({ where: filters });
            return fnOutputHandler_1.default.success({
                output: count,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error counting cards: " + error.message,
                error: { message: "Error counting cards: " + error.message },
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
exports.default = CardModel;
//# sourceMappingURL=cardModel.js.map