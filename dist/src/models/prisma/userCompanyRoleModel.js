"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class UserCompanyRoleModel {
    static async getOne(filters) {
        try {
            const result = await prisma.userCompanyRole.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "UserCompanyRole not found",
                    error: { message: "UserCompanyRole not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching userCompanyRole: " + error.message,
                error: { message: "Error fetching userCompanyRole: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.userCompanyRole.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching userCompanyRoles: " + error.message,
                error: { message: "Error fetching userCompanyRoles: " + error.message },
            });
        }
    }
    static async create(input) {
        try {
            const created = await prisma.userCompanyRole.create({ data: input });
            return fnOutputHandler_1.default.success({ code: 201, output: created });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating userCompanyRole: " + error.message,
                error: { message: "Error creating userCompanyRole: " + error.message },
            });
        }
    }
    static async update(identifier, data) {
        try {
            const where = typeof identifier === "string" ? { id: identifier } : identifier;
            const updated = await prisma.userCompanyRole.update({ where, data });
            return fnOutputHandler_1.default.success({ code: 204, output: updated });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating userCompanyRole: " + error.message,
                error: { message: "Error updating userCompanyRole: " + error.message },
            });
        }
    }
    static async delete(identifier) {
        try {
            const where = typeof identifier === "string" ? { id: identifier } : identifier;
            const deleted = await prisma.userCompanyRole.delete({ where });
            return fnOutputHandler_1.default.success({ output: deleted });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting userCompanyRole: " + error.message,
                error: { message: "Error deleting userCompanyRole: " + error.message },
            });
        }
    }
    static async count(filters) {
        try {
            const count = await prisma.userCompanyRole.count({ where: filters });
            return count;
        }
        catch (error) {
            throw new Error(`Failed to count UserCompanyRole records: ${error.message}`);
        }
    }
}
exports.default = UserCompanyRoleModel;
//# sourceMappingURL=userCompanyRoleModel.js.map