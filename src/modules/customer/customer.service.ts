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

@Injectable()
export class CustomerService {
  constructor() {}

  async create(
    companyId: string,
    createCustomerDto: CreateCustomerDto
  ): Promise<CustomerResponseDto> {
    // Check if customer already exists for this company
    const existingCustomerResult = await CustomerModel.getOne({
      companyId,
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
    const customerResult = await CustomerModel.create({
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
      id_document_front: createCustomerDto.id_document_front,
      id_document_back: createCustomerDto.id_document_back,
      date_of_birth: new Date(createCustomerDto.date_of_birth),
    });
    if (customerResult.error) {
      throw new ConflictException(customerResult.error.message);
    }
    const customer = customerResult.output;
    return this.mapToResponseDto(customer);
  }

  async findAllByCompany(companyId: string): Promise<CustomerResponseDto[]> {
    const customersResult = await CustomerModel.get({
      company_id: companyId,
      is_active: true,
    });
    if (customersResult.error) {
      throw new NotFoundException(customersResult.error.message);
    }
    const customers = customersResult.output;
    return customers.map((customer) => this.mapToResponseDto(customer));
  }

  async findOne(
    companyId: string,
    customerId: string
  ): Promise<CustomerResponseDto> {
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
      is_active: true,
    });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;
    return this.mapToResponseDto(customer);
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
