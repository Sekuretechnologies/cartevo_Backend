// src/models/prisma/providerSyncMetadataModel.ts
import { FilterObject } from "@/types";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";

export interface ProviderSyncMetadataModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputSync: Prisma.SyncmetadataUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, syncData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
  getByCompanyProviderType(
    companyId: string,
    providerName: string,
    syncType: string
  ): Promise<any>;
  upsert(
    companyId: string,
    providerName: string,
    syncType: string,
    lastSyncDate: Date
  ): Promise<any>;
  getLastSyncDate(
    companyId: string,
    providerName: string,
    syncType: string
  ): Promise<Date | null>;
}

class ProviderSyncMetadataModel {
  static get prisma() {
    return new PrismaClient();
  }

  static async getOne(filters: FilterObject) {
    try {
      const result = await this.prisma.syncmetadata.findFirst({
        where: filters,
      });
      if (!result) {
        return fnOutput.error({
          message: "Provider sync metadata not found",
          error: { message: "Provider sync metadata not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching provider sync metadata: " + error.message,
        error: {
          message: "Error fetching provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await this.prisma.syncmetadata.findMany({
        where: filters,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching provider sync metadata: " + error.message,
        error: {
          message: "Error fetching provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async getByCompanyProviderType(
    companyId: string,
    providerName: string,
    syncType: string
  ) {
    try {
      const result = await this.prisma.syncmetadata.findFirst({
        where: {
          company_id: companyId,
          provider_name: providerName,
          sync_type: syncType,
        },
      });
      if (!result) {
        return fnOutput.error({
          message: "Provider sync metadata not found",
          error: { message: "Provider sync metadata not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching provider sync metadata: " + error.message,
        error: {
          message: "Error fetching provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async upsert(
    companyId: string,
    providerName: string,
    syncType: string,
    lastSyncDate: Date
  ) {
    try {
      const result = await this.prisma.syncmetadata.upsert({
        where: {
          company_id_provider_name_sync_type: {
            company_id: companyId,
            provider_name: providerName,
            sync_type: syncType,
          },
        },
        update: {
          last_sync_date: lastSyncDate,
          updated_at: new Date(),
        },
        create: {
          id: `${companyId}-${providerName}-${syncType}`,
          provider_name: providerName,
          sync_type: syncType,
          last_sync_date: lastSyncDate,
          company_id: companyId,
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error upserting provider sync metadata: " + error.message,
        error: {
          message: "Error upserting provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async create(inputSync: Prisma.SyncmetadataUncheckedCreateInput) {
    try {
      const syncData: any = { ...inputSync };
      if (inputSync.company_id) {
        syncData.company_id = undefined;
        syncData.company = {
          connect: { id: inputSync.company_id },
        };
      }

      const sync = await this.prisma.syncmetadata.create({
        data: syncData,
      });
      return fnOutput.success({ code: 201, output: sync });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating provider sync metadata: " + error.message,
        error: {
          message: "Error creating provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async update(identifier: string | any, syncData: any) {
    try {
      const { key, value } = this.setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.SyncmetadataWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedSync = await this.prisma.syncmetadata.update({
        where,
        data: syncData,
      });
      return fnOutput.success({ code: 204, output: updatedSync });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating provider sync metadata: " + error.message,
        error: {
          message: "Error updating provider sync metadata: " + error.message,
        },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = this.setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.SyncmetadataWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedSync = await this.prisma.syncmetadata.delete({
        where,
      });
      return fnOutput.success({ output: deletedSync });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting provider sync metadata: " + error.message,
        error: {
          message: "Error deleting provider sync metadata: " + error.message,
        },
      });
    }
  }

  private static setMethodFilter(identifier: string | any) {
    if (typeof identifier === "string") {
      return { key: "id", value: identifier };
    }
    if (identifier && typeof identifier === "object") {
      const keys = Object.keys(identifier);
      if (keys.length > 0) {
        return { key: keys[0], value: identifier[keys[0]] };
      }
    }
    return { key: "id", value: identifier };
  }

  static async getLastSyncDate(
    companyId: string,
    providerName: string,
    syncType: string
  ): Promise<Date | null> {
    try {
      const result = await this.prisma.syncmetadata.findFirst({
        where: {
          company_id: companyId,
          provider_name: providerName,
          sync_type: syncType,
        },
        select: {
          last_sync_date: true,
        },
      });
      return result?.last_sync_date || null;
    } catch (error: any) {
      console.error("Error fetching last sync date:", error.message);
      return null;
    }
  }

  /**
   * This method allows for transactional operations.
   * It accepts a callback function that receives the Prisma client instance.
   * The transaction ensures that if any step fails, all changes are rolled back.
   *
   * @param callback The callback function to execute within the transaction.
   * @returns The result of the callback function.
   */
  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default ProviderSyncMetadataModel;
