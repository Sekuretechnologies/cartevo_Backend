"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class UserModel {
    static async getOne(filters, include = {}) {
        try {
            const result = await prisma.user.findFirst((0, functions_1.buildPrismaQuery)({ filters, include }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "User not found",
                    error: { message: "User not found" },
                });
            }
            return fnOutputHandler_1.default.success({
                output: result,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching user: " + error.message,
                error: { message: "Error fetching user: " + error.message },
            });
        }
    }
    static async getWithRolesAndCompany(filters) {
        try {
            const { roleId, companyId } = filters;
            const where = {};
            if (companyId || roleId) {
                where.userCompanyRoles = {
                    some: {},
                };
                if (companyId) {
                    where.userCompanyRoles.some.companyId = companyId;
                }
                if (roleId) {
                    where.userCompanyRoles.some.roleId = roleId;
                }
            }
            const result = await prisma.user.findMany({
                where,
                include: {
                    userCompanyRoles: {
                        include: { role: true, company: true },
                    },
                },
            });
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching users by role/company: " + error.message,
                error: {
                    message: "Error fetching users by role/company: " + error.message,
                },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.user.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({
                output: result,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching users: " + error.message,
                error: { message: "Error fetching users: " + error.message },
            });
        }
    }
    static async create(inputUser, hashedPassword) {
        try {
            let password = "";
            if (!hashedPassword) {
                password = await bcrypt.hash(inputUser.password, 12);
            }
            else {
                password = hashedPassword;
            }
            const userData = { ...inputUser };
            userData.password = password;
            if (inputUser.address) {
                userData.address = (0, common_1.sanitizeTextInput)(inputUser.address);
            }
            const user = await prisma.user.create({
                data: userData,
            });
            return fnOutputHandler_1.default.success({
                code: 201,
                output: user,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating user: " + error.message,
                error: { message: "Error creating user: " + error.message },
            });
        }
    }
    static async update(identifier, userData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedUserData = { ...userData };
            if (userData.password) {
                let password = await bcrypt.hash(userData.password, 12);
                updatedUserData.password = password;
            }
            if (userData.address) {
                updatedUserData.address = (0, common_1.sanitizeTextInput)(userData.address);
            }
            const updatedUser = await prisma.user.update({
                where,
                data: updatedUserData,
            });
            return fnOutputHandler_1.default.success({
                code: 204,
                output: updatedUser,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating user: " + error.message,
                error: { message: "Error updating user: " + error.message },
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
            const deletedUser = await prisma.user.delete({
                where,
            });
            return fnOutputHandler_1.default.success({
                output: deletedUser,
            });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting user: " + error.message,
                error: { message: "Error deleting user: " + error.message },
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
exports.default = UserModel;
//# sourceMappingURL=userModel.js.map