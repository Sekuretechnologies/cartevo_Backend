// src/models/prisma/customerProviderMappingModel.ts
import { FilterObject } from "@/types";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma } from "@prisma/client";

export interface CustomerProviderMappingModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputMapping: Prisma.CustomerProviderMappingUncheckedCreateInput
  ): Promise<any>;
  update(identifier: string | any, mappingData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
  getByCustomerAndProvider(
    customerId: string,
    providerName: string
  ): Promise<any>;
}

class CustomerProviderMappingModel {
  static get prisma() {
    return require("@/modules/prisma/prisma.service").prisma;
  }

  static async getOne(filters: FilterObject) {
    try {
      const result = await this.prisma.customerProviderMapping.findFirst({
        where: filters,
        include: {
          customer: true,
        },
      });
      if (!result) {
        return fnOutput.error({
          message: "Customer provider mapping not found",
          error: { message: "Customer provider mapping not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer provider mapping: " + error.message,
        error: {
          message: "Error fetching customer provider mapping: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await this.prisma.customerProviderMapping.findMany({
        where: filters,
        include: {
          customer: true,
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer provider mappings: " + error.message,
        error: {
          message:
            "Error fetching customer provider mappings: " + error.message,
        },
      });
    }
  }

  static async getByCustomerAndProvider(
    customerId: string,
    providerName: string
  ) {
    try {
      const result = await this.prisma.customerProviderMapping.findFirst({
        where: {
          customer_id: customerId,
          provider_name: providerName,
        },
        include: {
          customer: true,
        },
      });
      if (!result) {
        return fnOutput.error({
          message: "Customer provider mapping not found",
          error: { message: "Customer provider mapping not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer provider mapping: " + error.message,
        error: {
          message: "Error fetching customer provider mapping: " + error.message,
        },
      });
    }
  }

  static async create(
    inputMapping: Prisma.CustomerProviderMappingUncheckedCreateInput
  ) {
    try {
      const mappingData: any = { ...inputMapping };
      if (inputMapping.customer_id) {
        mappingData.customer_id = undefined;
        mappingData.customer = {
          connect: { id: inputMapping.customer_id },
        };
      }

      const mapping = await this.prisma.customerProviderMapping.create({
        data: mappingData,
        include: {
          customer: true,
        },
      });
      return fnOutput.success({ code: 201, output: mapping });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating customer provider mapping: " + error.message,
        error: {
          message: "Error creating customer provider mapping: " + error.message,
        },
      });
    }
  }

  static async update(identifier: string | any, mappingData: any) {
    try {
      const { key, value } = this.setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.CustomerProviderMappingWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedMapping = await this.prisma.customerProviderMapping.update({
        where,
        data: mappingData,
        include: {
          customer: true,
        },
      });
      return fnOutput.success({ code: 204, output: updatedMapping });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating customer provider mapping: " + error.message,
        error: {
          message: "Error updating customer provider mapping: " + error.message,
        },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = this.setMethodFilter(identifier);
      const where = {
        [key]: value,
      } as Prisma.CustomerProviderMappingWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedMapping = await this.prisma.customerProviderMapping.delete({
        where,
        include: {
          customer: true,
        },
      });
      return fnOutput.success({ output: deletedMapping });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting customer provider mapping: " + error.message,
        error: {
          message: "Error deleting customer provider mapping: " + error.message,
        },
      });
    }
  }

  static async upsert(
    customerId: string,
    providerName: string,
    providerCustomerId: string,
    metadata?: any
  ) {
    try {
      const result = await this.prisma.customerProviderMapping.upsert({
        where: {
          customer_id_provider_name: {
            customer_id: customerId,
            provider_name: providerName,
          },
        },
        update: {
          provider_customer_id: providerCustomerId,
          metadata: metadata,
          updated_at: new Date(),
        },
        create: {
          customer_id: customerId,
          provider_name: providerName,
          provider_customer_id: providerCustomerId,
          metadata: metadata,
        },
        include: {
          customer: true,
        },
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error upserting customer provider mapping: " + error.message,
        error: {
          message:
            "Error upserting customer provider mapping: " + error.message,
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

export default CustomerProviderMappingModel;
