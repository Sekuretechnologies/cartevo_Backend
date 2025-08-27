"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("../../utils/shared/common");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const client_1 = require("@prisma/client");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class CustomerModel {
    static async getOne(filters) {
        try {
            const result = await prisma.customer.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Customer not found",
                    error: { message: "Customer not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching customer: " + error.message,
                error: { message: "Error fetching customer: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.customer.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching customers: " + error.message,
                error: { message: "Error fetching customers: " + error.message },
            });
        }
    }
    static async getCustomersWithCardCount(filters) {
        try {
            const query = `
      SELECT 
          c.id AS id,
          c.first_name AS first_name,
          c.last_name AS last_name,
          c.country_phone_code AS country_phone_code,
          c.phone_number AS phone_number,
          c.email AS email,
          c.created_at AS created_at,
          COUNT(card.id) AS number_of_cards
      FROM 
          "Customer" c
      WHERE c.company_id = ${filters.company_id}
      LEFT JOIN 
          "Card" card ON c.id = card.customer_id
      GROUP BY 
          c.id;
    `;
            const result = await prisma.$queryRaw `${query}`;
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching customers: " + error.message,
                error: { message: "Error fetching customers: " + error.message },
            });
        }
    }
    static async create(inputCustomer) {
        try {
            const customerData = { ...inputCustomer };
            if (inputCustomer.first_name) {
                customerData.first_name = (0, common_1.sanitizeTextInput)(inputCustomer.first_name);
            }
            if (inputCustomer.last_name) {
                customerData.last_name = (0, common_1.sanitizeTextInput)(inputCustomer.last_name);
            }
            if (inputCustomer.street) {
                customerData.street = (0, common_1.sanitizeTextInput)(inputCustomer.street);
            }
            if (inputCustomer.city) {
                customerData.city = (0, common_1.sanitizeTextInput)(inputCustomer.city);
            }
            if (inputCustomer.state) {
                customerData.state = (0, common_1.sanitizeTextInput)(inputCustomer.state);
            }
            if (inputCustomer.postal_code) {
                customerData.postal_code = (0, common_1.sanitizeTextInput)(inputCustomer.postal_code);
            }
            if (inputCustomer.company_id) {
                customerData.company_id = undefined;
                customerData.company = {
                    connect: { id: inputCustomer.company_id },
                };
            }
            const customer = await prisma.customer.create({ data: customerData });
            return fnOutputHandler_1.default.success({ code: 201, output: customer });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating customer: " + error.message,
                error: { message: "Error creating customer: " + error.message },
            });
        }
    }
    static async update(identifier, customerData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedCustomerData = {
                ...customerData,
            };
            if (customerData.street) {
                updatedCustomerData.street = (0, common_1.sanitizeTextInput)(customerData.street);
            }
            if (customerData.city) {
                updatedCustomerData.city = (0, common_1.sanitizeTextInput)(customerData.city);
            }
            if (customerData.state) {
                updatedCustomerData.state = (0, common_1.sanitizeTextInput)(customerData.state);
            }
            if (customerData.postal_code) {
                updatedCustomerData.postal_code = (0, common_1.sanitizeTextInput)(customerData.postal_code);
            }
            const updatedCustomer = await prisma.customer.update({
                where,
                data: updatedCustomerData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedCustomer });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating customer: " + error.message,
                error: { message: "Error updating customer: " + error.message },
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
            const deletedCustomer = await prisma.customer.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedCustomer });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting customer: " + error.message,
                error: { message: "Error deleting customer: " + error.message },
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
exports.default = CustomerModel;
//# sourceMappingURL=customerModel.js.map