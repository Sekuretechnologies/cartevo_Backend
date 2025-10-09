import fnOutput from "@/utils/shared/fnOutputHandler";
import { helpRequestStatus, Prisma, PrismaClient } from "@prisma/client";

interface FilterObject {
  status?: helpRequestStatus;
  countryCode?: string;
}

const prisma = new PrismaClient();

class ContactModel {
  static async getMyMessage(filters?: FilterObject) {
    try {
      const result = await prisma.helpRequest.findMany({
        where: {
          ...(filters?.status && { status: filters.status }),
          ...(filters?.countryCode && { countryCode: filters.countryCode }),
        },
        orderBy: {
          createAt: "desc",
        },
      });

      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching help requests: " + error.message,
        error: { message: "Error fetching help requests: " + error.message },
      });
    }
  }

  static async createMessage(
    inputHelpRequest: Prisma.helpRequestUncheckedCreateInput
  ) {
    try {
      const requestData = { ...inputHelpRequest };

      const helpRequest = await prisma.helpRequest.create({
        data: requestData,
      });

      return fnOutput.success({
        code: 201,
        output: helpRequest,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating help request: " + error.message,
        error: { message: "Error creating help request: " + error.message },
      });
    }
  }
}
