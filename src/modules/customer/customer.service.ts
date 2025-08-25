import {
  Injectable,
  ConflictException,
  NotFoundException,
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

@Injectable()
export class CustomerService {
  constructor(private firebaseService: FirebaseService) {}

  async create(
    companyId: string,
    createCustomerDto: CreateCustomerDto,
    files?: {
      id_document_front?: any[];
      id_document_back?: any[];
    }
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

  async findAllByCompany(companyId: string): Promise<{ data: any[] }> {
    const customersResult = await CustomerModel.get({
      company_id: companyId,
      is_active: true,
    });
    if (customersResult.error) {
      throw new NotFoundException(customersResult.error.message);
    }
    const customers = customersResult.output;
    return {
      data: customers, // customers.map((customer) => this.mapToResponseDto(customer)),
    };
  }

  async findOne(
    companyId: string,
    customerId: string
  ): Promise<{ data: CustomerResponseDto }> {
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
      is_active: true,
    });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;
    return { data: this.mapToResponseDto(customer) };
  }

  async findCustomerCards(
    companyId: string,
    customerId: string
  ): Promise<{ data: any[] }> {
    const customerCardsResult = await CardModel.get({
      customer_id: customerId,
      company_id: companyId,
    });
    if (customerCardsResult.error || !customerCardsResult.output) {
      throw new NotFoundException("Customer cards not found");
    }
    const customerCards = customerCardsResult.output;
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
