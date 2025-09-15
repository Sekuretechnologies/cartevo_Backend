// src/services/customerProviderMapping.service.ts
import { CustomerProviderMappingModel } from "@/models";

export class CustomerProviderMappingService {
  /**
   * Create or update a customer provider mapping
   */
  static async upsertMapping(
    customerId: string,
    providerName: string,
    providerCustomerId: string,
    metadata?: any
  ) {
    try {
      const result = await CustomerProviderMappingModel.upsert(
        customerId,
        providerName,
        providerCustomerId,
        metadata
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        status: "success",
        message: "Customer provider mapping saved successfully",
        data: result.output,
      };
    } catch (error: any) {
      console.error("Error saving customer provider mapping:", error);
      throw new Error(
        `Failed to save customer provider mapping: ${error.message}`
      );
    }
  }

  /**
   * Get provider customer ID for a given customer and provider
   */
  static async getProviderCustomerId(
    customerId: string,
    providerName: string
  ): Promise<string | null> {
    try {
      const result =
        await CustomerProviderMappingModel.getByCustomerAndProvider(
          customerId,
          providerName
        );

      if (result.error) {
        return null;
      }

      return result.output.provider_customer_id;
    } catch (error: any) {
      console.error("Error getting provider customer ID:", error);
      return null;
    }
  }

  /**
   * Get all provider mappings for a customer
   */
  static async getCustomerMappings(customerId: string) {
    try {
      const result = await CustomerProviderMappingModel.get({
        customer_id: customerId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        status: "success",
        message: "Customer provider mappings retrieved successfully",
        data: result.output,
      };
    } catch (error: any) {
      console.error("Error getting customer mappings:", error);
      throw new Error(`Failed to get customer mappings: ${error.message}`);
    }
  }

  /**
   * Get all customers for a specific provider
   */
  static async getProviderCustomers(providerName: string) {
    try {
      const result = await CustomerProviderMappingModel.get({
        provider_name: providerName,
        is_active: true,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        status: "success",
        message: "Provider customers retrieved successfully",
        data: result.output,
      };
    } catch (error: any) {
      console.error("Error getting provider customers:", error);
      throw new Error(`Failed to get provider customers: ${error.message}`);
    }
  }

  /**
   * Deactivate a customer provider mapping
   */
  static async deactivateMapping(customerId: string, providerName: string) {
    try {
      const result = await CustomerProviderMappingModel.update(
        { customer_id: customerId, provider_name: providerName },
        { is_active: false }
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        status: "success",
        message: "Customer provider mapping deactivated successfully",
        data: result.output,
      };
    } catch (error: any) {
      console.error("Error deactivating customer provider mapping:", error);
      throw new Error(
        `Failed to deactivate customer provider mapping: ${error.message}`
      );
    }
  }

  /**
   * Delete a customer provider mapping
   */
  static async deleteMapping(customerId: string, providerName: string) {
    try {
      const result = await CustomerProviderMappingModel.delete({
        customer_id: customerId,
        provider_name: providerName,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        status: "success",
        message: "Customer provider mapping deleted successfully",
        data: result.output,
      };
    } catch (error: any) {
      console.error("Error deleting customer provider mapping:", error);
      throw new Error(
        `Failed to delete customer provider mapping: ${error.message}`
      );
    }
  }
}

export default CustomerProviderMappingService;
