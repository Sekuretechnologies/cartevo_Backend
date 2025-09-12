// src/models/prisma/customerModel.ts
import { FilterObject } from "@/types";
import { sanitizeTextInput, setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma } from "@prisma/client";

export interface CustomerModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputCustomer: Prisma.CustomerUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, customerData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class CustomerModel {
  static get prisma() {
    return require("@/modules/prisma/prisma.service").prisma;
  }
  static async getOne(filters: FilterObject) {
    try {
      const result = await this.prisma.customer.findFirst({
        where: filters,
      });
      if (!result) {
        return fnOutput.error({
          message: "Customer not found",
          error: { message: "Customer not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customer: " + error.message,
        error: { message: "Error fetching customer: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await this.prisma.customer.findMany({
        where: filters,
      });
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customers: " + error.message,
        error: { message: "Error fetching customers: " + error.message },
      });
    }
  }

  static async getCustomersWithCardCount(filters?: FilterObject) {
    try {
      if (!filters?.company_id) {
        return fnOutput.error({
          message: "Company ID is required",
          error: { message: "Company ID is required" },
        });
      }

      const customers = await this.prisma.customer.findMany({
        where: {
          company_id: filters.company_id,
        },
        include: {
          cards: true,
        },
      });

      const customersWithCardCount = customers.map((customer) => ({
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        country_phone_code: customer.country_phone_code,
        phone_number: customer.phone_number,
        email: customer.email,
        created_at: customer.created_at,
        number_of_cards: customer.cards.length,
      }));

      return fnOutput.success({ output: customersWithCardCount });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching customers with card count: " + error.message,
        error: {
          message: "Error fetching customers with card count: " + error.message,
        },
      });
    }
  }

  static async create(inputCustomer: Prisma.CustomerUncheckedCreateInput) {
    try {
      const customerData: any = { ...inputCustomer };
      if (inputCustomer.first_name) {
        customerData.first_name = sanitizeTextInput(inputCustomer.first_name);
      }
      if (inputCustomer.last_name) {
        customerData.last_name = sanitizeTextInput(inputCustomer.last_name);
      }
      if (inputCustomer.street) {
        customerData.street = sanitizeTextInput(inputCustomer.street);
      }
      if (inputCustomer.city) {
        customerData.city = sanitizeTextInput(inputCustomer.city);
      }
      if (inputCustomer.state) {
        customerData.state = sanitizeTextInput(inputCustomer.state);
      }
      if (inputCustomer.postal_code) {
        customerData.postal_code = sanitizeTextInput(inputCustomer.postal_code);
      }
      if (inputCustomer.company_id) {
        customerData.company_id = undefined;
        customerData.company = {
          connect: { id: inputCustomer.company_id },
        };
      }
      const customer = await this.prisma.customer.create({
        data: customerData,
      });
      return fnOutput.success({ code: 201, output: customer });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating customer: " + error.message,
        error: { message: "Error creating customer: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, customerData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CustomerWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedCustomerData: Prisma.CustomerUncheckedUpdateInput = {
        ...customerData,
      };
      if (customerData.street) {
        updatedCustomerData.street = sanitizeTextInput(customerData.street);
      }
      if (customerData.city) {
        updatedCustomerData.city = sanitizeTextInput(customerData.city);
      }
      if (customerData.state) {
        updatedCustomerData.state = sanitizeTextInput(customerData.state);
      }
      if (customerData.postal_code) {
        updatedCustomerData.postal_code = sanitizeTextInput(
          customerData.postal_code
        );
      }
      const updatedCustomer = await this.prisma.customer.update({
        where,
        data: updatedCustomerData,
      });
      return fnOutput.success({ code: 204, output: updatedCustomer });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating customer: " + error.message,
        error: { message: "Error updating customer: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CustomerWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedCustomer = await this.prisma.customer.delete({ where });
      return fnOutput.success({ output: deletedCustomer });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting customer: " + error.message,
        error: { message: "Error deleting customer: " + error.message },
      });
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

export default CustomerModel;
