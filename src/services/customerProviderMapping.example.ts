// src/services/customerProviderMapping.example.ts
// Example usage of CustomerProviderMappingService

import CustomerProviderMappingService from "./customerProviderMapping.service";

/**
 * Example: How to use CustomerProviderMappingService in your Maplerad integration
 */
export class CustomerProviderMappingExample {
  /**
   * Example: Save a Maplerad customer ID when creating a customer
   */
  static async exampleSaveMapleradCustomerId() {
    try {
      const customerId = "your-internal-customer-id";
      const providerName = "maplerad";
      const providerCustomerId = "maplerad-customer-12345";

      // Save the mapping
      const result = await CustomerProviderMappingService.upsertMapping(
        customerId,
        providerName,
        providerCustomerId,
        {
          created_at_provider: new Date().toISOString(),
          provider_metadata: {
            status: "active",
            tier: "premium",
          },
        }
      );

      console.log("Mapping saved:", result);
      return result;
    } catch (error) {
      console.error("Error saving mapping:", error);
    }
  }

  /**
   * Example: Get Maplerad customer ID for API calls
   */
  static async exampleGetMapleradCustomerId() {
    try {
      const customerId = "your-internal-customer-id";
      const providerName = "maplerad";

      // Get the provider customer ID
      const providerCustomerId =
        await CustomerProviderMappingService.getProviderCustomerId(
          customerId,
          providerName
        );

      if (providerCustomerId) {
        console.log("Found Maplerad customer ID:", providerCustomerId);
        // Use this ID for Maplerad API calls
        return providerCustomerId;
      } else {
        console.log("No mapping found for this customer");
        return null;
      }
    } catch (error) {
      console.error("Error getting mapping:", error);
    }
  }

  /**
   * Example: Get all provider mappings for a customer
   */
  static async exampleGetAllCustomerMappings() {
    try {
      const customerId = "your-internal-customer-id";

      const result = await CustomerProviderMappingService.getCustomerMappings(
        customerId
      );

      console.log("Customer mappings:", result.data);
      // This will return mappings for all providers (maplerad, sudo, flutterwave, etc.)
      return result.data;
    } catch (error) {
      console.error("Error getting customer mappings:", error);
    }
  }

  /**
   * Example: Integration with Maplerad card creation
   */
  static async exampleMapleradIntegration() {
    try {
      const customerId = "your-internal-customer-id";

      // 1. Check if we already have a Maplerad customer ID
      let mapleradCustomerId =
        await CustomerProviderMappingService.getProviderCustomerId(
          customerId,
          "maplerad"
        );

      if (!mapleradCustomerId) {
        // 2. If not, create customer in Maplerad API
        // const mapleradResponse = await mapleradApi.createCustomer(customerData);
        // mapleradCustomerId = mapleradResponse.customerId;

        // 3. Save the mapping
        await CustomerProviderMappingService.upsertMapping(
          customerId,
          "maplerad",
          mapleradCustomerId,
          { created_via: "card_creation_flow" }
        );
      }

      // 4. Use the Maplerad customer ID for further operations
      console.log("Using Maplerad customer ID:", mapleradCustomerId);

      return mapleradCustomerId;
    } catch (error) {
      console.error("Error in Maplerad integration:", error);
    }
  }

  /**
   * Example: Handle multiple providers
   */
  static async exampleMultiProviderSupport() {
    try {
      const customerId = "your-internal-customer-id";

      // Save mappings for multiple providers
      const providers = [
        { name: "maplerad", customerId: "maplerad-123" },
        { name: "sudo", customerId: "sudo-456" },
        { name: "flutterwave", customerId: "flutterwave-789" },
      ];

      for (const provider of providers) {
        await CustomerProviderMappingService.upsertMapping(
          customerId,
          provider.name,
          provider.customerId
        );
      }

      // Get all mappings
      const mappings = await CustomerProviderMappingService.getCustomerMappings(
        customerId
      );
      console.log("All provider mappings:", mappings.data);

      return mappings.data;
    } catch (error) {
      console.error("Error in multi-provider example:", error);
    }
  }
}

export default CustomerProviderMappingExample;
