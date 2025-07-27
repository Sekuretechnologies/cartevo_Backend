"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const prisma = new client_1.PrismaClient();
class SyncmetadataModel {
    static async getOne(filters) {
        try {
            const result = await prisma.syncmetadata.findFirst({
                where: filters,
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: 'Error fetching syncmetadata: ' + error.message,
                error: { message: 'Error fetching syncmetadata: ' + error.message },
            });
        }
    }
    static async create(data) {
        try {
            const result = await prisma.syncmetadata.create({ data });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: 'Error creating syncmetadata: ' + error.message,
                error: { message: 'Error creating syncmetadata: ' + error.message },
            });
        }
    }
    static async update(id, data) {
        try {
            const result = await prisma.syncmetadata.update({
                where: { id },
                data,
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: 'Error updating syncmetadata: ' + error.message,
                error: { message: 'Error updating syncmetadata: ' + error.message },
            });
        }
    }
    static async delete(id) {
        try {
            const result = await prisma.syncmetadata.delete({
                where: { id },
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: 'Error deleting syncmetadata: ' + error.message,
                error: { message: 'Error deleting syncmetadata: ' + error.message },
            });
        }
    }
}
exports.default = SyncmetadataModel;
//# sourceMappingURL=syncmetadataModel.js.map