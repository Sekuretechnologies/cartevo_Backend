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
const companyModel_1 = require("../../models/prisma/companyModel");
const customerModel_1 = require("../../models/prisma/customerModel");
let CustomerService = class CustomerService {
    constructor() { }
    async create(companyId, createCustomerDto) {
        const existingCustomerResult = await customerModel_1.default.getOne({
            companyId,
            email: createCustomerDto.email,
        });
        if (existingCustomerResult.output) {
            throw new common_1.ConflictException("Customer with this email already exists");
        }
        const companyResult = await companyModel_1.default.getOne({ id: companyId });
        if (!companyResult.output) {
            throw new common_1.NotFoundException("Company not found");
        }
        const customerResult = await customerModel_1.default.create({
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
            throw new common_1.ConflictException(customerResult.error.message);
        }
        const customer = customerResult.output;
        return this.mapToResponseDto(customer);
    }
    async findAllByCompany(companyId) {
        const customersResult = await customerModel_1.default.get({
            company_id: companyId,
            is_active: true,
        });
        if (customersResult.error) {
            throw new common_1.NotFoundException(customersResult.error.message);
        }
        const customers = customersResult.output;
        return customers.map((customer) => this.mapToResponseDto(customer));
    }
    async findOne(companyId, customerId) {
        const customerResult = await customerModel_1.default.getOne({
            id: customerId,
            company_id: companyId,
            is_active: true,
        });
        if (customerResult.error || !customerResult.output) {
            throw new common_1.NotFoundException("Customer not found");
        }
        const customer = customerResult.output;
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
            date_of_birth: customer.date_of_birth,
            is_active: customer.isActive,
            created_at: customer.createdAt,
            updated_at: customer.updatedAt,
        };
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CustomerService);
//# sourceMappingURL=customer.service.js.map