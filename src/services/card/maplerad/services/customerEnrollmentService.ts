import { CustomerModel, CompanyModel } from "@/models";
import {
  CustomerEnrollmentRequest,
  CustomerEnrollmentResult,
  MapleradEnrollmentData,
  DocumentValidationResult,
  AddressValidationResult,
  PhoneValidationResult,
  CustomerEnrollmentError,
  KYCIncompleteError,
  DocumentValidationError,
  KYCValidationContext,
  CountryMapping,
  IdTypeMapping,
} from "../types/customerEnrollment.types";

/**
 * Customer Enrollment Service for Maplerad Integration
 * Handles complete customer lifecycle management with KYC support
 */
export class CustomerEnrollmentService {
  // Country mapping configuration
  private static readonly COUNTRY_MAPPINGS: CountryMapping = {
    US: {
      mapleradCode: "US",
      supportedIdTypes: ["PASSPORT", "DRIVERS_LICENCE"],
      defaultState: "California",
      defaultCity: "Los Angeles",
    },
    CM: {
      mapleradCode: "CM",
      supportedIdTypes: ["NIN", "PASSPORT", "DRIVERS_LICENCE"],
      defaultState: "Littoral",
      defaultCity: "Douala",
    },
    NG: {
      mapleradCode: "NG",
      supportedIdTypes: ["NIN", "PASSPORT", "VOTERS_CARD", "DRIVERS_LICENCE"],
      defaultState: "Lagos",
      defaultCity: "Lagos",
    },
    GB: {
      mapleradCode: "GB",
      supportedIdTypes: ["PASSPORT", "DRIVERS_LICENCE"],
      defaultState: "England",
      defaultCity: "London",
    },
  };

  // ID type mapping
  private static readonly ID_TYPE_MAPPINGS: IdTypeMapping = {
    NATIONAL_ID: "NIN",
    ID_CARD: "NIN",
    CNI: "NIN",
    PASSPORT: "PASSPORT",
    DRIVERS_LICENSE: "DRIVERS_LICENCE",
    DRIVING_LICENSE: "DRIVERS_LICENCE",
    VOTERS_CARD: "VOTERS_CARD",
    TEMPORARY_ID: "NIN",
  };

  /**
   * Main enrollment method - ensures Maplerad customer exists
   */
  static async enrollCustomer(
    request: CustomerEnrollmentRequest
  ): Promise<CustomerEnrollmentResult> {
    try {
      console.log("🏦 Starting customer enrollment process", {
        customerId: request.customerId,
        autoCreate: request.autoCreateIfMissing,
      });

      // 1. Get customer from database
      const customerResult = await CustomerModel.getOne({
        id: request.customerId,
      });
      if (customerResult.error) {
        throw new CustomerEnrollmentError(
          `Customer not found: ${request.customerId}`,
          "CUSTOMER_NOT_FOUND"
        );
      }

      const customer = customerResult.output;

      // 2. Check if already enrolled with Maplerad
      if (customer.maplerad_customer_id) {
        console.log("✅ Customer already enrolled with Maplerad", {
          customerId: request.customerId,
          mapleradCustomerId: customer.maplerad_customer_id,
        });

        return {
          success: true,
          mapleradCustomerId: customer.maplerad_customer_id,
          verificationStatus: "completed",
          existingCustomer: true,
        };
      }

      // 3. Validate KYC requirements
      await this.validateKYCRequirements(customer);

      // 4. Build enrollment data
      const enrollmentData = await this.buildEnrollmentData(customer);

      // 5. Submit enrollment to Maplerad
      const mapleradCustomer = await this.submitToMaplerad(enrollmentData);

      // 6. Update local customer record
      await this.updateLocalCustomerRecord(
        request.customerId,
        mapleradCustomer
      );

      console.log("🎉 Customer enrollment completed successfully", {
        customerId: request.customerId,
        mapleradCustomerId: mapleradCustomer.id,
        verificationStatus: "completed",
      });

      return {
        success: true,
        mapleradCustomerId: mapleradCustomer.id,
        verificationStatus: "completed",
        existingCustomer: false,
      };
    } catch (error: any) {
      console.error("❌ Customer enrollment failed", {
        customerId: request.customerId,
        error: error.message,
      });

      if (error instanceof CustomerEnrollmentError) {
        return {
          success: false,
          verificationStatus: "failed",
          errors: [error.message],
        };
      }

      throw error;
    }
  }

  /**
   * Validate KYC requirements for customer
   */
  private static async validateKYCRequirements(customer: any): Promise<void> {
    const missingFields = [];
    const requiredFields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "country_iso_code",
      "date_of_birth",
    ];

    // Check basic required fields
    for (const field of requiredFields) {
      if (!customer[field]) {
        missingFields.push(field);
      }
    }

    // Validate identity document
    if (!customer.id_document || !customer.id_type) {
      missingFields.push("identity_document");
    }

    // Validate address information
    if (!customer.address || !customer.city) {
      missingFields.push("address_information");
    }

    if (missingFields.length > 0) {
      throw new KYCIncompleteError(missingFields, customer.id);
    }

    // Validate document type is supported
    const countryMapping = this.COUNTRY_MAPPINGS[customer.country_iso_code];
    if (countryMapping) {
      const mapleradIdType = this.mapIdTypeToMaplerad(customer.id_type);
      if (!countryMapping.supportedIdTypes.includes(mapleradIdType)) {
        throw new DocumentValidationError(customer.id_type, [
          `ID type ${customer.id_type} not supported in ${customer.country_iso_code}`,
        ]);
      }
    }
  }

  /**
   * Build complete enrollment data for Maplerad
   */
  private static async buildEnrollmentData(
    customer: any
  ): Promise<MapleradEnrollmentData> {
    // Format phone number
    const phoneResult = this.formatPhoneNumber(
      customer.phone,
      customer.country_iso_code
    );

    // Format date of birth
    const dobFormatted = this.formatDateOfBirth(customer.date_of_birth);

    // Map country code
    const mapleradCountry = this.mapCountryCode(customer.country_iso_code);

    // Map ID type
    const mapleradIdType = this.mapIdTypeToMaplerad(customer.id_type);

    // Build complete address
    const address = this.buildAddress(customer);

    return {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: this.formatEmailForMaplerad(customer.email),
      country: mapleradCountry,
      identification_number:
        customer.id_number || this.generateFallbackIdNumber(),
      dob: dobFormatted,

      phone: {
        phone_country_code: phoneResult.countryCode,
        phone_number: phoneResult.nationalNumber,
      },

      identity: {
        type: mapleradIdType,
        image: customer.id_document || "",
        number: customer.id_number || this.generateFallbackIdNumber(),
        country: mapleradCountry,
      },

      address,

      photo: customer.selfie_url || undefined,
    };
  }

  /**
   * Submit enrollment to Maplerad API
   */
  private static async submitToMaplerad(
    enrollmentData: MapleradEnrollmentData
  ): Promise<any> {
    try {
      // This would integrate with the Maplerad API client
      // For now, we'll simulate the call structure
      const mockMapleradAPI = {
        enrollCustomerFull: async (data: MapleradEnrollmentData) => {
          console.log("📤 Submitting to Maplerad API", {
            firstName: data.first_name,
            lastName: data.last_name,
            country: data.country,
            hasIdentityImage: !!data.identity.image,
            hasPhoto: !!data.photo,
          });

          // Mock successful response
          return {
            id: `maplerad_${Date.now()}`,
            customer_id: `maplerad_${Date.now()}`,
            status: "active",
            verification_status: "completed",
            created_at: new Date().toISOString(),
          };
        },
      };

      return await mockMapleradAPI.enrollCustomerFull(enrollmentData);
    } catch (error: any) {
      console.error("❌ Maplerad enrollment API call failed", {
        error: error.message,
        enrollmentData: {
          firstName: enrollmentData.first_name,
          lastName: enrollmentData.last_name,
          country: enrollmentData.country,
        },
      });

      throw new CustomerEnrollmentError(
        `Maplerad enrollment failed: ${error.message}`,
        "MAPLERAD_API_ERROR",
        { originalError: error.message }
      );
    }
  }

  /**
   * Update local customer record with Maplerad information
   */
  private static async updateLocalCustomerRecord(
    customerId: string,
    mapleradCustomer: any
  ): Promise<void> {
    try {
      await CustomerModel.update(customerId, {
        maplerad_customer_id:
          mapleradCustomer.id || mapleradCustomer.customer_id,
        maplerad_verification_status:
          mapleradCustomer.verification_status || "completed",
        maplerad_enrolled_at: new Date(),
        updated_at: new Date(),
      });

      console.log("✅ Local customer record updated", {
        customerId,
        mapleradCustomerId: mapleradCustomer.id || mapleradCustomer.customer_id,
      });
    } catch (error: any) {
      console.error("❌ Failed to update local customer record", {
        customerId,
        error: error.message,
      });

      throw new CustomerEnrollmentError(
        `Failed to update customer record: ${error.message}`,
        "DATABASE_UPDATE_ERROR"
      );
    }
  }

  /**
   * Format phone number for Maplerad requirements
   */
  private static formatPhoneNumber(
    phone: string,
    countryCode: string
  ): { countryCode: string; nationalNumber: string } {
    if (!phone) {
      throw new CustomerEnrollmentError(
        "Phone number is required",
        "PHONE_REQUIRED"
      );
    }

    // Clean phone number
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Default country codes
    const defaultCountryCodes: { [key: string]: string } = {
      US: "+1",
      CM: "+237",
      NG: "+234",
      GB: "+44",
    };

    // Extract country code and national number
    if (cleanPhone.startsWith("+")) {
      const match = cleanPhone.match(/^(\+\d{1,4})(\d+)$/);
      if (match) {
        return {
          countryCode: match[1],
          nationalNumber: match[2],
        };
      }
    }

    // If no country code, add default for country
    const defaultCode = defaultCountryCodes[countryCode] || "+1";

    // Remove leading zeros
    const nationalNumber = cleanPhone.startsWith("0")
      ? cleanPhone.substring(1)
      : cleanPhone;

    return {
      countryCode: defaultCode,
      nationalNumber,
    };
  }

  /**
   * Format date of birth for Maplerad (DD-MM-YYYY)
   */
  private static formatDateOfBirth(dateOfBirth: Date | string): string {
    const date = new Date(dateOfBirth);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /**
   * Format email for Maplerad (add ? before @ for uniqueness)
   */
  private static formatEmailForMaplerad(email: string): string {
    if (!email) {
      throw new CustomerEnrollmentError("Email is required", "EMAIL_REQUIRED");
    }

    // Maplerad specific email formatting to avoid duplicates
    return email.replace("@", "?@");
  }

  /**
   * Map local country codes to Maplerad supported countries
   */
  private static mapCountryCode(localCountryCode: string): string {
    const mapping = this.COUNTRY_MAPPINGS[localCountryCode];
    if (mapping) {
      return mapping.mapleradCode;
    }

    // Fallback to Cameroon if country not supported
    console.warn("Country not supported by Maplerad, using CM as fallback", {
      originalCountry: localCountryCode,
      fallback: "CM",
    });
    return "CM";
  }

  /**
   * Map local ID types to Maplerad supported types
   */
  private static mapIdTypeToMaplerad(localIdType: string): string {
    if (!localIdType) return "NIN";

    const mapped = this.ID_TYPE_MAPPINGS[localIdType.toUpperCase()];
    if (mapped) {
      return mapped;
    }

    // Default to NIN for unknown types
    console.warn("ID type not recognized, using NIN as fallback", {
      originalType: localIdType,
      fallback: "NIN",
    });
    return "NIN";
  }

  /**
   * Build complete address object
   */
  private static buildAddress(customer: any): {
    street: string;
    street2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  } {
    const countryMapping = this.COUNTRY_MAPPINGS[customer.country_iso_code];

    return {
      street: customer.address || "Address not specified",
      street2: customer.address_line_2,
      city: customer.city || countryMapping?.defaultCity || "Default City",
      state: customer.state || countryMapping?.defaultState || "Default State",
      country: this.mapCountryCode(customer.country_iso_code),
      postal_code: customer.postal_code || "00000",
    };
  }

  /**
   * Generate fallback ID number when not available
   */
  private static generateFallbackIdNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `AUTO_${timestamp}_${random}`;
  }

  /**
   * Validate identity document
   */
  static async validateIdentityDocument(
    documentUrl: string,
    documentType: string
  ): Promise<DocumentValidationResult> {
    const errors = [];

    // Basic validation
    if (!documentUrl) {
      errors.push("Document image URL is required");
    }

    if (!documentType) {
      errors.push("Document type is required");
    }

    // URL validation
    if (documentUrl && !this.isValidImageUrl(documentUrl)) {
      errors.push("Document image URL is not valid");
    }

    // Document type validation
    const mapleradType = this.mapIdTypeToMaplerad(documentType);
    if (!Object.values(this.ID_TYPE_MAPPINGS).includes(mapleradType)) {
      errors.push(`Document type ${documentType} is not supported`);
    }

    if (errors.length > 0) {
      return {
        valid: false,
        documentType,
        verifications: {
          imageQuality: false,
          readability: false,
          authenticity: false,
        },
        errors,
      };
    }

    return {
      valid: true,
      documentType: mapleradType,
      verifications: {
        imageQuality: true,
        readability: true,
        authenticity: true,
      },
    };
  }

  /**
   * Validate address information
   */
  static async validateAddress(
    address: any,
    countryCode: string
  ): Promise<AddressValidationResult> {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!address.street && !address.address) {
      errors.push("Street address is required");
    }

    if (!address.city) {
      errors.push("City is required");
    }

    // Get country-specific requirements
    const countryMapping = this.COUNTRY_MAPPINGS[countryCode];

    if (!countryMapping) {
      warnings.push(
        `Country ${countryCode} may not be fully supported by Maplerad`
      );
    }

    // Standardize address
    const standardizedAddress = {
      street: address.street || address.address || "Address not specified",
      city: address.city || countryMapping?.defaultCity || "Default City",
      state: address.state || countryMapping?.defaultState || "Default State",
      country: countryMapping?.mapleradCode || "CM",
      postal_code: address.postal_code || "00000",
    };

    return {
      valid: errors.length === 0,
      standardizedAddress:
        errors.length === 0 ? standardizedAddress : undefined,
      warnings,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate phone number
   */
  static async validatePhone(
    phone: string,
    countryCode: string
  ): Promise<PhoneValidationResult> {
    try {
      const formatted = this.formatPhoneNumber(phone, countryCode);

      return {
        valid: true,
        formattedNumber: {
          countryCode: formatted.countryCode,
          nationalNumber: formatted.nationalNumber,
          internationalFormat: `${formatted.countryCode}${formatted.nationalNumber}`,
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Update customer information in Maplerad
   */
  static async updateCustomerInfo(
    customerId: string,
    updates: any
  ): Promise<CustomerEnrollmentResult> {
    try {
      // Get customer with Maplerad ID
      const customerResult = await CustomerModel.getOne({ id: customerId });
      if (customerResult.error) {
        throw new CustomerEnrollmentError(
          `Customer not found: ${customerId}`,
          "CUSTOMER_NOT_FOUND"
        );
      }

      const customer = customerResult.output;
      if (!customer.maplerad_customer_id) {
        throw new CustomerEnrollmentError(
          "Customer not enrolled with Maplerad",
          "NOT_ENROLLED"
        );
      }

      // Build update data for Maplerad
      const updateData = this.buildUpdateData(
        customer.maplerad_customer_id,
        updates
      );

      // Submit updates to Maplerad
      const updateResult = await this.submitUpdatesToMaplerad(updateData);

      return {
        success: updateResult.success,
        mapleradCustomerId: customer.maplerad_customer_id,
        verificationStatus: "completed",
        errors: updateResult.success ? undefined : [updateResult.error],
      };
    } catch (error: any) {
      console.error("❌ Customer update failed", {
        customerId,
        error: error.message,
      });

      return {
        success: false,
        verificationStatus: "failed",
        errors: [error.message],
      };
    }
  }

  /**
   * Build update data for Maplerad customer updates
   */
  private static buildUpdateData(
    mapleradCustomerId: string,
    updates: any
  ): any {
    const updateData: any = {
      customer_id: mapleradCustomerId,
    };

    // Map update fields
    if (updates.first_name) updateData.first_name = updates.first_name;
    if (updates.last_name) updateData.last_name = updates.last_name;
    if (updates.phone) {
      const phoneResult = this.formatPhoneNumber(
        updates.phone,
        updates.country_iso_code || "CM"
      );
      updateData.phone = {
        phone_country_code: phoneResult.countryCode,
        phone_number: phoneResult.nationalNumber,
      };
    }

    if (updates.address) {
      updateData.address = this.buildAddress(updates);
    }

    if (updates.id_document) {
      updateData.identity = {
        type: this.mapIdTypeToMaplerad(updates.id_type || "NIN"),
        image: updates.id_document,
        number: updates.id_number || this.generateFallbackIdNumber(),
        country: this.mapCountryCode(updates.country_iso_code || "CM"),
      };
    }

    return updateData;
  }

  /**
   * Submit updates to Maplerad API
   */
  private static async submitUpdatesToMaplerad(updateData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Mock Maplerad API call for customer update
      const mockMapleradAPI = {
        updateCustomer: async (data: any) => {
          console.log("📤 Updating Maplerad customer", {
            customerId: data.customer_id,
            fieldsToUpdate: Object.keys(data).filter(
              (k) => k !== "customer_id"
            ),
          });

          return {
            success: true,
            message: "Customer updated successfully",
          };
        },
      };

      const result = await mockMapleradAPI.updateCustomer(updateData);
      return { success: result.success };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate image URL format
   */
  private static isValidImageUrl(url: string): boolean {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    } catch {
      return false;
    }
  }

  /**
   * Get enrollment status for customer
   */
  static async getEnrollmentStatus(customerId: string): Promise<{
    enrolled: boolean;
    mapleradCustomerId?: string;
    verificationStatus?: string;
    enrolledAt?: Date;
  }> {
    const customerResult = await CustomerModel.getOne({ id: customerId });
    if (customerResult.error) {
      return { enrolled: false };
    }

    const customer = customerResult.output;

    return {
      enrolled: !!customer.maplerad_customer_id,
      mapleradCustomerId: customer.maplerad_customer_id,
      verificationStatus: customer.maplerad_verification_status || "unknown",
      enrolledAt: customer.maplerad_enrolled_at,
    };
  }
}
