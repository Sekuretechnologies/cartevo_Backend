"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class RoleModel {
    static async getOne(filters) {
        try {
            const result = await prisma.role.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Role not found",
                    error: { message: "Role not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching role: " + error.message,
                error: { message: "Error fetching role: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.role.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching roles: " + error.message,
                error: { message: "Error fetching roles: " + error.message },
            });
        }
    }
    static async create(inputRole) {
        try {
            const role = await prisma.role.create({ data: inputRole });
            return fnOutputHandler_1.default.success({ code: 201, output: role });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating role: " + error.message,
                error: { message: "Error creating role: " + error.message },
            });
        }
    }
    static async update(identifier, roleData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedRole = await prisma.role.update({ where, data: roleData });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedRole });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating role: " + error.message,
                error: { message: "Error updating role: " + error.message },
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
            const deletedRole = await prisma.role.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedRole });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting role: " + error.message,
                error: { message: "Error deleting role: " + error.message },
            });
        }
    }
}
exports.default = RoleModel;
//# sourceMappingURL=roleModel.js.map