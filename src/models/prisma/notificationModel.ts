import { Prisma, PrismaClient } from "@prisma/client";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { setMethodFilter } from "@/utils/shared/common";
import { FilterObject } from "@/types";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

class NotificationModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.notification.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Notification not found",
          error: { message: "Notification not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching notification: " + error.message,
        error: { message: "Error fetching notification: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.notification.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching notifications: " + error.message,
        error: { message: "Error fetching notifications: " + error.message },
      });
    }
  }
  static async create(
    inputNotification: Prisma.NotificationUncheckedCreateInput
  ) {
    try {
      const notification = await prisma.notification.create({
        data: inputNotification,
      });
      return fnOutput.success({ code: 201, output: notification });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating notification: " + error.message,
        error: { message: "Error creating notification: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, notificationData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.NotificationWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedNotification = await prisma.notification.update({
        where,
        data: notificationData,
      });
      return fnOutput.success({ code: 204, output: updatedNotification });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating notification: " + error.message,
        error: { message: "Error updating notification: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.NotificationWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedNotification = await prisma.notification.delete({ where });
      return fnOutput.success({ output: deletedNotification });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting notification: " + error.message,
        error: { message: "Error deleting notification: " + error.message },
      });
    }
  }
}

export default NotificationModel;
