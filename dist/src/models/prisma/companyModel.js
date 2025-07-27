"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class CompanyModel {
    static async getOne(filters) {
        try {
            const result = await prisma.company.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Company not found",
                    error: { message: "Company not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching company: " + error.message,
                error: { message: "Error fetching company: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.company.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching companies: " + error.message,
                error: { message: "Error fetching companies: " + error.message },
            });
        }
    }
    static async create(inputCompany) {
        try {
            const companyData = { ...inputCompany };
            if (inputCompany.name) {
                companyData.name = (0, common_1.sanitizeTextInput)(inputCompany.name);
            }
            if (inputCompany.country) {
                companyData.country = (0, common_1.sanitizeTextInput)(inputCompany.country);
            }
            if (inputCompany.email) {
                companyData.email = (0, common_1.sanitizeTextInput)(inputCompany.email);
            }
            const company = await prisma.company.create({ data: companyData });
            return fnOutputHandler_1.default.success({ code: 201, output: company });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating company: " + error.message,
                error: { message: "Error creating company: " + error.message },
            });
        }
    }
    static async update(identifier, companyData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedCompanyData = {
                ...companyData,
            };
            if (companyData.name) {
                updatedCompanyData.name = (0, common_1.sanitizeTextInput)(companyData.name);
            }
            if (companyData.country) {
                updatedCompanyData.country = (0, common_1.sanitizeTextInput)(companyData.country);
            }
            if (companyData.email) {
                updatedCompanyData.email = (0, common_1.sanitizeTextInput)(companyData.email);
            }
            const updatedCompany = await prisma.company.update({
                where,
                data: updatedCompanyData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedCompany });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating company: " + error.message,
                error: { message: "Error updating company: " + error.message },
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
            const deletedCompany = await prisma.company.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedCompany });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting company: " + error.message,
                error: { message: "Error deleting company: " + error.message },
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
exports.default = CompanyModel;
//# sourceMappingURL=companyModel.js.map