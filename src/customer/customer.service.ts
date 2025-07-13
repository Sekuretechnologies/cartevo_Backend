import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CustomerResponseDto } from './dto/customer.dto';
import { IdentificationType } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    // Check if customer already exists for this company
    const existingCustomer = await this.prisma.customer.findUnique({
      where: {
        companyId_email: {
          companyId,
          email: createCustomerDto.email,
        },
      },
    });

    if (existingCustomer) {
      throw new ConflictException('Customer with this email already exists');
    }

    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        firstName: createCustomerDto.first_name,
        lastName: createCustomerDto.last_name,
        country: createCustomerDto.country,
        email: createCustomerDto.email,
        street: createCustomerDto.street,
        city: createCustomerDto.city,
        state: createCustomerDto.state,
        postalCode: createCustomerDto.postal_code,
        phoneCountryCode: createCustomerDto.phone_country_code,
        phoneNumber: createCustomerDto.phone_number,
        identificationNumber: createCustomerDto.identification_number,
        type: createCustomerDto.type as IdentificationType,
        image: createCustomerDto.image,
        photo: createCustomerDto.photo,
        number: createCustomerDto.number,
        dob: new Date(createCustomerDto.dob),
      },
    });

    return this.mapToResponseDto(customer);
  }

  async findAllByCompany(companyId: string): Promise<CustomerResponseDto[]> {
    const customers = await this.prisma.customer.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return customers.map(customer => this.mapToResponseDto(customer));
  }

  async findOne(companyId: string, customerId: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        isActive: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

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
      dob: customer.dob,
      is_active: customer.isActive,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    };
  }
}
