"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const prisma = new client_1.PrismaClient();
class CustomerLogsModel {
    static async getOne(filters) {
        try {
            const result = await prisma.customerLogs.findFirst({
                where: filters,
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching customer log: " + error.message,
                error: { message: "Error fetching customer log: " + error.message },
            });
        }
    }
    static async create(data) {
        try {
            const result = await prisma.customerLogs.create({ data });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating customer log: " + error.message,
                error: { message: "Error creating customer log: " + error.message },
            });
        }
    }
    static async update(id, data) {
        try {
            const result = await prisma.customerLogs.update({
                where: { id },
                data,
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating customer log: " + error.message,
                error: { message: "Error updating customer log: " + error.message },
            });
        }
    }
    static async delete(id) {
        try {
            const result = await prisma.customerLogs.delete({
                where: { id },
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting customer log: " + error.message,
                error: { message: "Error deleting customer log: " + error.message },
            });
        }
    }
}
exports.default = CustomerLogsModel;
//# sourceMappingURL=customerLogsModel.js.map