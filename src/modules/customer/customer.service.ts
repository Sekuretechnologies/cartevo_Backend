import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import { CreateCustomerDto, CustomerResponseDto } from "./dto/customer.dto";
import { IdentificationType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { FirebaseService } from "@/services/firebase.service";
import { EmailService } from "@/services/email.service";
import { CardSyncService } from "@/modules/maplerad/services/card.sync.service";
import { CardIssuanceService } from "@/modules/maplerad/services/card.issuance.service";
import CustomerProviderMappingModel from "@/models/prisma/customerProviderMappingModel";

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private firebaseService: FirebaseService,
    private cardSyncService: CardSyncService,
    private cardIssuanceService: CardIssuanceService
  ) {}

  async create(
    companyId: string,
    createCustomerDto: CreateCustomerDto,
    files?: {
      id_document_front?: any[];
      id_document_back?: any[];
    },
    enrollOnMaplerad: boolean = false
  ): Promise<CustomerResponseDto> {
    // Check if customer already exists for this company
    const existingCustomerResult = await CustomerModel.getOne({
      company_id: companyId,
      identification_number: createCustomerDto.identification_number,
      email: createCustomerDto.email,
    });
    if (existingCustomerResult.output) {
      throw new ConflictException("Customer with this email already exists");
    }
    // Verify company exists
    const companyResult = await CompanyModel.getOne({ id: companyId });
    if (!companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    const company = companyResult.output;

    const customerId = uuidv4();

    // Upload files to Firebase if provided
    let idDocumentBackUrl = null;
    let idDocumentFrontUrl = null;

    if (files?.id_document_back?.[0]) {
      const file = files.id_document_back[0];
      idDocumentBackUrl = await this.firebaseService.uploadFile(
        file.buffer,
        `id_document_back_${Date.now()}.${file.originalname.split(".").pop()}`,
        `companies/${companyId}/customers/${customerId}`,
        file.mimetype
      );
    }

    if (files?.id_document_front?.[0]) {
      const file = files.id_document_front[0];
      idDocumentFrontUrl = await this.firebaseService.uploadFile(
        file.buffer,
        `id_document_front_${Date.now()}.${file.originalname.split(".").pop()}`,
        `companies/${companyId}/customers/${customerId}`,
        file.mimetype
      );
    }

    console.log("idDocumentBackUrl :: ", idDocumentBackUrl);
    console.log("idDocumentFrontUrl :: ", idDocumentFrontUrl);

    const customerResult = await CustomerModel.create({
      id: customerId,
      company_id: companyId,
      first_name: createCustomerDto.first_name,
      last_name: createCustomerDto.last_name,
      country: createCustomerDto.country,
      email: createCustomerDto.email,
      street: createCustomerDto.street,
      city: createCustomerDto.city,
      state: createCustomerDto.state,
      postal_code: createCustomerDto.postal_code,
      country_iso_code: createCustomerDto.country_iso_code,
      country_phone_code: createCustomerDto.country_phone_code,
      phone_number: createCustomerDto.phone_number,
      identification_number: createCustomerDto.identification_number,
      id_document_type: createCustomerDto.id_document_type,
      id_document_front: idDocumentFrontUrl,
      id_document_back: idDocumentBackUrl,
      date_of_birth: new Date(createCustomerDto.date_of_birth),
    });
    if (customerResult.error) {
      throw new ConflictException(customerResult.error.message);
    }
    const customer = customerResult.output;

    // Enroll customer on Maplerad if requested
    if (enrollOnMaplerad) {
      this.logger.log("🌐 ENROLLING CUSTOMER ON MAPLERAD", {
        customerId,
        companyId,
        customerEmail: customer.email,
        timestamp: new Date().toISOString(),
      });

      try {
        const enrollmentStartTime = Date.now();
        const mapleradCustomerId =
          await this.cardIssuanceService.ensureMapleradCustomer(
            customer,
            companyId
          );
        const enrollmentDuration = Date.now() - enrollmentStartTime;

        this.logger.log("✅ CUSTOMER ENROLLED ON MAPLERAD SUCCESSFULLY", {
          customerId,
          mapleradCustomerId,
          duration: `${enrollmentDuration}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (enrollmentError: any) {
        this.logger.error("❌ MAPLERAD ENROLLMENT FAILED", {
          customerId,
          error: enrollmentError.message,
          timestamp: new Date().toISOString(),
        });

        // Log the error but don't fail the customer creation
        // The customer is still created locally, just not enrolled on Maplerad
        this.logger.warn(
          "⚠️ CUSTOMER CREATED LOCALLY BUT MAPLERAD ENROLLMENT FAILED",
          {
            customerId,
            companyId,
            enrollmentError: enrollmentError.message,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }

    return this.mapToResponseDto(customer);
  }

  async update(
    companyId: string,
    customerId: string,
    createCustomerDto: CreateCustomerDto,
    files?: {
      id_document_front?: any[];
      id_document_back?: any[];
    }
  ): Promise<CustomerResponseDto> {
    // Check if customer already exists for this company
    const existingCustomerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
    });
    if (!existingCustomerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = existingCustomerResult.output;
    // Verify company exists
    const companyResult = await CompanyModel.getOne({ id: companyId });
    if (!companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    const company = companyResult.output;

    // Upload files to Firebase if provided
    let idDocumentBackUrl = null;
    let idDocumentFrontUrl = null;

    if (files?.id_document_back?.[0]) {
      const file = files.id_document_back[0];
      idDocumentBackUrl = await this.firebaseService.uploadFile(
        file.buffer,
        `id_document_back_${Date.now()}.${file.originalname.split(".").pop()}`,
        `companies/${companyId}/customers/${customerId}`,
        file.mimetype
      );
    }

    if (files?.id_document_front?.[0]) {
      const file = files.id_document_front[0];
      idDocumentFrontUrl = await this.firebaseService.uploadFile(
        file.buffer,
        `id_document_front_${Date.now()}.${file.originalname.split(".").pop()}`,
        `companies/${companyId}/customers/${customerId}`,
        file.mimetype
      );
    }

    const updatedCustomerResult = await CustomerModel.update(
      { id: customerId },
      {
        id: customerId,
        company_id: companyId,
        first_name: createCustomerDto.first_name,
        last_name: createCustomerDto.last_name,
        country: createCustomerDto.country,
        email: createCustomerDto.email,
        street: createCustomerDto.street,
        city: createCustomerDto.city,
        state: createCustomerDto.state,
        postal_code: createCustomerDto.postal_code,
        country_iso_code: createCustomerDto.country_iso_code,
        country_phone_code: createCustomerDto.country_phone_code,
        phone_number: createCustomerDto.phone_number,
        identification_number: createCustomerDto.identification_number,
        id_document_type: createCustomerDto.id_document_type,
        id_document_front: idDocumentFrontUrl,
        id_document_back: idDocumentBackUrl,
        date_of_birth: new Date(createCustomerDto.date_of_birth),
        updated_at: new Date(),
      }
    );
    if (updatedCustomerResult.error) {
      throw new ConflictException(updatedCustomerResult.error.message);
    }
    const updatedCustomer = updatedCustomerResult.output;
    return this.mapToResponseDto(updatedCustomer);
  }

  async findAllByCompany(
    companyId: string,
    sync: boolean = false
  ): Promise<{ data: any[] }> {
    this.logger.log(`🔍 CUSTOMER RETRIEVAL - START`, {
      companyId,
      sync,
      timestamp: new Date().toISOString(),
    });

    // Sync customers with provider before returning if requested
    if (sync) {
      this.logger.log(`🔄 CUSTOMER SYNC REQUESTED`, {
        companyId,
        syncType: "customers",
        timestamp: new Date().toISOString(),
      });

      try {
        const syncStartTime = Date.now();
        await this.cardSyncService.syncCustomers(companyId, { force: false });
        const syncDuration = Date.now() - syncStartTime;

        this.logger.log(`✅ CUSTOMER SYNC COMPLETED`, {
          companyId,
          duration: `${syncDuration}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (syncError) {
        this.logger.error(`❌ CUSTOMER SYNC FAILED`, {
          companyId,
          error: syncError.message,
          timestamp: new Date().toISOString(),
        });

        this.logger.warn(`⚠️ PROCEEDING WITH LOCAL DATA`, {
          companyId,
          reason: "Sync failed, using cached data",
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(`📊 FETCHING CUSTOMERS FROM DATABASE`, {
      companyId,
      timestamp: new Date().toISOString(),
    });

    const customersResult = await CustomerModel.get({
      company_id: companyId,
      is_active: true,
    });

    if (customersResult.error) {
      this.logger.error(`❌ DATABASE QUERY FAILED`, {
        companyId,
        error: customersResult.error.message,
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException(customersResult.error.message);
    }

    const customers = customersResult.output;
    this.logger.log(`📈 CUSTOMERS RETRIEVED`, {
      companyId,
      customerCount: customers.length,
      timestamp: new Date().toISOString(),
    });

    // Fetch provider mappings for all customers
    this.logger.log(`🔗 ATTACHING PROVIDER MAPPINGS`, {
      companyId,
      customerCount: customers.length,
      timestamp: new Date().toISOString(),
    });

    const customersWithMappings = await this.attachProviderMappings(customers);

    this.logger.log(`✅ CUSTOMER RETRIEVAL COMPLETED`, {
      companyId,
      totalCustomers: customersWithMappings.length,
      timestamp: new Date().toISOString(),
    });

    return {
      data: customersWithMappings,
    };
  }

  async findAllCustomersWithCardCountByCompany(
    companyId: string,
    sync: boolean = false
  ): Promise<{ data: any[] }> {
    this.logger.log(`🔍 CUSTOMER WITH CARD COUNT RETRIEVAL - START`, {
      companyId,
      sync,
      timestamp: new Date().toISOString(),
    });

    // Sync customers with provider before returning if requested
    if (sync) {
      this.logger.log(`🔄 CUSTOMER SYNC REQUESTED`, {
        companyId,
        syncType: "customers_with_card_count",
        timestamp: new Date().toISOString(),
      });

      try {
        const syncStartTime = Date.now();
        await this.cardSyncService.syncCustomers(companyId, { force: false });
        const syncDuration = Date.now() - syncStartTime;

        this.logger.log(`✅ CUSTOMER SYNC COMPLETED`, {
          companyId,
          duration: `${syncDuration}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (syncError) {
        this.logger.error(`❌ CUSTOMER SYNC FAILED`, {
          companyId,
          error: syncError.message,
          timestamp: new Date().toISOString(),
        });

        this.logger.warn(`⚠️ PROCEEDING WITH LOCAL DATA`, {
          companyId,
          reason: "Sync failed, using cached data",
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(`📊 FETCHING CUSTOMERS WITH CARD COUNT FROM DATABASE`, {
      companyId,
      timestamp: new Date().toISOString(),
    });

    const customersResult = await CustomerModel.getCustomersWithCardCount({
      company_id: companyId,
      is_active: true,
    });

    if (customersResult.error) {
      this.logger.error(`❌ DATABASE QUERY FAILED`, {
        companyId,
        error: customersResult.error.message,
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException(customersResult.error.message);
    }

    const customers = customersResult.output;
    this.logger.log(`📈 CUSTOMERS WITH CARD COUNT RETRIEVED`, {
      companyId,
      customerCount: customers.length,
      timestamp: new Date().toISOString(),
    });

    // Fetch provider mappings for all customers
    this.logger.log(`🔗 ATTACHING PROVIDER MAPPINGS`, {
      companyId,
      customerCount: customers.length,
      timestamp: new Date().toISOString(),
    });

    const customersWithMappings = await this.attachProviderMappings(customers);

    this.logger.log(`✅ CUSTOMER WITH CARD COUNT RETRIEVAL COMPLETED`, {
      companyId,
      totalCustomers: customersWithMappings.length,
      timestamp: new Date().toISOString(),
    });

    return {
      data: customersWithMappings,
    };
  }

  async findOne(companyId: string, customerId: string): Promise<{ data: any }> {
    this.logger.log(`🔍 SINGLE CUSTOMER RETRIEVAL - START`, {
      companyId,
      customerId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`📊 FETCHING SINGLE CUSTOMER FROM DATABASE`, {
      companyId,
      customerId,
      timestamp: new Date().toISOString(),
    });

    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
      is_active: true,
    });

    if (customerResult.error || !customerResult.output) {
      this.logger.error(`❌ CUSTOMER NOT FOUND`, {
        companyId,
        customerId,
        error: customerResult.error?.message || "Customer not found",
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException("Customer not found");
    }

    const customer = customerResult.output;
    this.logger.log(`📈 CUSTOMER RETRIEVED`, {
      companyId,
      customerId,
      customerEmail: customer.email,
      timestamp: new Date().toISOString(),
    });

    // Fetch provider mappings for this customer
    this.logger.log(`🔗 ATTACHING PROVIDER MAPPINGS`, {
      companyId,
      customerId,
      timestamp: new Date().toISOString(),
    });

    const customersWithMappings = await this.attachProviderMappings([customer]);

    this.logger.log(`✅ SINGLE CUSTOMER RETRIEVAL COMPLETED`, {
      companyId,
      customerId,
      hasProviderMappings:
        customersWithMappings[0]?.provider_mappings?.length > 0,
      timestamp: new Date().toISOString(),
    });

    return { data: customersWithMappings[0] };
  }

  async findCustomerCards(
    companyId: string,
    customerId: string,
    sync: boolean = false
  ): Promise<{ data: any[] }> {
    this.logger.log("🔍 CUSTOMER CARDS RETRIEVAL - START", {
      companyId,
      customerId,
      sync,
      timestamp: new Date().toISOString(),
    });

    // Sync customer cards if requested
    if (sync) {
      this.logger.log("🔄 CUSTOMER CARDS SYNC REQUESTED", {
        companyId,
        customerId,
        timestamp: new Date().toISOString(),
      });

      try {
        const syncStartTime = Date.now();
        await this.cardSyncService.syncCustomerCards(customerId, companyId, {
          force: true,
          maxConcurrency: 3,
        });
        const syncDuration = Date.now() - syncStartTime;

        this.logger.log("✅ CUSTOMER CARDS SYNC COMPLETED", {
          companyId,
          customerId,
          duration: `${syncDuration}ms`,
          timestamp: new Date().toISOString(),
        });
      } catch (syncError: any) {
        this.logger.error("❌ CUSTOMER CARDS SYNC FAILED", {
          companyId,
          customerId,
          error: syncError.message,
          timestamp: new Date().toISOString(),
        });

        this.logger.warn("⚠️ PROCEEDING WITH LOCAL DATA", {
          companyId,
          customerId,
          reason: "Sync failed, using cached data",
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log("📊 FETCHING CUSTOMER CARDS FROM DATABASE", {
      companyId,
      customerId,
      timestamp: new Date().toISOString(),
    });

    const customerCardsResult = await CardModel.get({
      customer_id: customerId,
      company_id: companyId,
    });

    if (customerCardsResult.error || !customerCardsResult.output) {
      this.logger.error("❌ CUSTOMER CARDS NOT FOUND", {
        companyId,
        customerId,
        error: customerCardsResult.error?.message || "Cards not found",
        timestamp: new Date().toISOString(),
      });
      throw new NotFoundException("Customer cards not found");
    }

    const customerCards = customerCardsResult.output;
    this.logger.log("📈 CUSTOMER CARDS RETRIEVED", {
      companyId,
      customerId,
      cardCount: customerCards.length,
      syncPerformed: sync,
      timestamp: new Date().toISOString(),
    });

    return { data: customerCards };
  }

  async findCustomerTransactions(
    companyId: string,
    customerId: string
  ): Promise<{ data: any[] }> {
    const customerTransactionsResult = await TransactionModel.get({
      customer_id: customerId,
      company_id: companyId,
    });
    if (
      customerTransactionsResult.error ||
      !customerTransactionsResult.output
    ) {
      throw new NotFoundException("Customer transactions not found");
    }
    const customerTransactions = customerTransactionsResult.output;
    return { data: customerTransactions };
  }

  /**
   * Attach provider mappings to customer data
   */
  private async attachProviderMappings(customers: any[]): Promise<any[]> {
    this.logger.log(`🔗 PROVIDER MAPPING ATTACHMENT - START`, {
      customerCount: customers?.length || 0,
      timestamp: new Date().toISOString(),
    });

    if (!customers || customers.length === 0) {
      this.logger.log(`⚠️ NO CUSTOMERS TO PROCESS`, {
        reason: "Empty or null customers array",
        timestamp: new Date().toISOString(),
      });
      return customers;
    }

    // Get all customer IDs
    const customerIds = customers.map((customer) => customer.id);
    this.logger.log(`📋 EXTRACTED CUSTOMER IDS`, {
      customerIds: customerIds.slice(0, 5), // Log first 5 IDs
      totalIds: customerIds.length,
      timestamp: new Date().toISOString(),
    });

    // Fetch provider mappings for all customers in batch
    this.logger.log(`🔍 FETCHING PROVIDER MAPPINGS FROM DATABASE`, {
      customerCount: customerIds.length,
      timestamp: new Date().toISOString(),
    });

    const mappingsResult = await CustomerProviderMappingModel.get({
      customer_id: { in: customerIds },
      is_active: true,
    });

    const mappings = mappingsResult.output || [];
    this.logger.log(`📊 PROVIDER MAPPINGS RETRIEVED`, {
      totalMappings: mappings.length,
      timestamp: new Date().toISOString(),
    });

    // Create a map of customer_id to their provider mappings
    const mappingsMap = new Map();
    for (const mapping of mappings) {
      if (!mappingsMap.has(mapping.customer_id)) {
        mappingsMap.set(mapping.customer_id, []);
      }
      mappingsMap.get(mapping.customer_id).push({
        provider_name: mapping.provider_name,
        provider_customer_id: mapping.provider_customer_id,
        // created_at: mapping.created_at,
        // updated_at: mapping.updated_at,
      });
    }

    this.logger.log(`🗺️ CREATED PROVIDER MAPPINGS MAP`, {
      mappedCustomers: mappingsMap.size,
      totalMappings: mappings.length,
      timestamp: new Date().toISOString(),
    });

    // Attach mappings to each customer
    const customersWithMappings = customers.map((customer) => {
      const customerMappings = mappingsMap.get(customer.id) || [];
      return {
        ...customer,
        provider_customer_id: customerMappings[0]?.provider_customer_id,
        provider_mappings: customerMappings,
      };
    });

    // Log summary statistics
    const customersWithMappingsCount = customersWithMappings.filter(
      (c) => c.provider_mappings.length > 0
    ).length;

    this.logger.log(`✅ PROVIDER MAPPING ATTACHMENT COMPLETED`, {
      totalCustomers: customers.length,
      customersWithMappings: customersWithMappingsCount,
      customersWithoutMappings: customers.length - customersWithMappingsCount,
      totalMappingsAttached: mappings.length,
      timestamp: new Date().toISOString(),
    });

    return customersWithMappings;
  }

  private mapToResponseDto(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      first_name: customer.firstName,
      last_name: customer.lastName,
      country: customer.country,
      email: customer.email,
      street: customer.street,
      city: customer.city,
      state: customer.state,
      postal_code: customer.postalCode,
      phone_country_code: customer.phoneCountryCode,
      phone_number: customer.phoneNumber,
      identification_number: customer.identificationNumber,
      type: customer.type,
      image: customer.image,
      photo: customer.photo,
      number: customer.number,
      date_of_birth: customer.date_of_birth,
      is_active: customer.isActive,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    };
  }
}
