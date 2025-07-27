"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const common_1 = require("../../utils/shared/common");
const functions_1 = require("../../../prisma/functions");
const prisma = new client_1.PrismaClient();
class NotificationModel {
    static async getOne(filters) {
        try {
            const result = await prisma.notification.findFirst((0, functions_1.buildPrismaQuery)({ filters }));
            if (!result) {
                return fnOutputHandler_1.default.error({
                    message: "Notification not found",
                    error: { message: "Notification not found" },
                });
            }
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching notification: " + error.message,
                error: { message: "Error fetching notification: " + error.message },
            });
        }
    }
    static async get(filters) {
        try {
            const result = await prisma.notification.findMany((0, functions_1.buildPrismaQuery)({ filters }));
            return fnOutputHandler_1.default.success({ output: result });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error fetching notifications: " + error.message,
                error: { message: "Error fetching notifications: " + error.message },
            });
        }
    }
    static async create(inputNotification) {
        try {
            const notification = await prisma.notification.create({
                data: inputNotification,
            });
            return fnOutputHandler_1.default.success({ code: 201, output: notification });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error creating notification: " + error.message,
                error: { message: "Error creating notification: " + error.message },
            });
        }
    }
    static async update(identifier, notificationData) {
        try {
            const { key, value } = (0, common_1.setMethodFilter)(identifier);
            const where = { [key]: value };
            if (!where[key]) {
                return fnOutputHandler_1.default.error({
                    message: "Invalid identifier provided",
                    error: { message: "Invalid identifier provided" },
                });
            }
            const updatedNotification = await prisma.notification.update({
                where,
                data: notificationData,
            });
            return fnOutputHandler_1.default.success({ code: 204, output: updatedNotification });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error updating notification: " + error.message,
                error: { message: "Error updating notification: " + error.message },
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
            const deletedNotification = await prisma.notification.delete({ where });
            return fnOutputHandler_1.default.success({ output: deletedNotification });
        }
        catch (error) {
            return fnOutputHandler_1.default.error({
                message: "Error deleting notification: " + error.message,
                error: { message: "Error deleting notification: " + error.message },
            });
        }
    }
}
exports.default = NotificationModel;
//# sourceMappingURL=notificationModel.js.map