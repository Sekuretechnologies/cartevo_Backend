"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CustomerService = class CustomerService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, createCustomerDto) {
        const existingCustomer = await this.prisma.customer.findUnique({
            where: {
                companyId_email: {
                    companyId,
                    email: createCustomerDto.email,
                },
            },
        });
        if (existingCustomer) {
            throw new common_1.ConflictException('Customer with this email already exists');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
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
                type: createCustomerDto.type,
                image: createCustomerDto.image,
                photo: createCustomerDto.photo,
                number: createCustomerDto.number,
                dob: new Date(createCustomerDto.dob),
            },
        });
        return this.mapToResponseDto(customer);
    }
    async findAllByCompany(companyId) {
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
    async findOne(companyId, customerId) {
        const customer = await this.prisma.customer.findFirst({
            where: {
                id: customerId,
                companyId,
                isActive: true,
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return this.mapToResponseDto(customer);
    }
    mapToResponseDto(customer) {
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
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map