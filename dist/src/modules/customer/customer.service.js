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
const cardModel_1 = require("../../models/prisma/cardModel");
const companyModel_1 = require("../../models/prisma/companyModel");
const customerModel_1 = require("../../models/prisma/customerModel");
const transactionModel_1 = require("../../models/prisma/transactionModel");
const uuid_1 = require("uuid");
const firebase_service_1 = require("../../services/firebase.service");
let CustomerService = class CustomerService {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async create(companyId, createCustomerDto, files) {
        const existingCustomerResult = await customerModel_1.default.getOne({
            company_id: companyId,
            identification_number: createCustomerDto.identification_number,
            email: createCustomerDto.email,
        });
        if (existingCustomerResult.output) {
            throw new common_1.ConflictException("Customer with this email already exists");
        }
        const companyResult = await companyModel_1.default.getOne({ id: companyId });
        if (!companyResult.output) {
            throw new common_1.NotFoundException("Company not found");
        }
        const company = companyResult.output;
        const customerId = (0, uuid_1.v4)();
        let idDocumentBackUrl = null;
        let idDocumentFrontUrl = null;
        if (files?.id_document_back?.[0]) {
            const file = files.id_document_back[0];
            idDocumentBackUrl = await this.firebaseService.uploadFile(file.buffer, `id_document_back_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${companyId}/customers/${customerId}`, file.mimetype);
        }
        if (files?.id_document_front?.[0]) {
            const file = files.id_document_front[0];
            idDocumentFrontUrl = await this.firebaseService.uploadFile(file.buffer, `id_document_front_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${companyId}/customers/${customerId}`, file.mimetype);
        }
        console.log("idDocumentBackUrl :: ", idDocumentBackUrl);
        console.log("idDocumentFrontUrl :: ", idDocumentFrontUrl);
        const customerResult = await customerModel_1.default.create({
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
            throw new common_1.ConflictException(customerResult.error.message);
        }
        const customer = customerResult.output;
        return this.mapToResponseDto(customer);
    }
    async update(companyId, customerId, createCustomerDto, files) {
        const existingCustomerResult = await customerModel_1.default.getOne({
            id: customerId,
            company_id: companyId,
        });
        if (!existingCustomerResult.output) {
            throw new common_1.NotFoundException("Customer not found");
        }
        const customer = existingCustomerResult.output;
        const companyResult = await companyModel_1.default.getOne({ id: companyId });
        if (!companyResult.output) {
            throw new common_1.NotFoundException("Company not found");
        }
        const company = companyResult.output;
        let idDocumentBackUrl = null;
        let idDocumentFrontUrl = null;
        if (files?.id_document_back?.[0]) {
            const file = files.id_document_back[0];
            idDocumentBackUrl = await this.firebaseService.uploadFile(file.buffer, `id_document_back_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${companyId}/customers/${customerId}`, file.mimetype);
        }
        if (files?.id_document_front?.[0]) {
            const file = files.id_document_front[0];
            idDocumentFrontUrl = await this.firebaseService.uploadFile(file.buffer, `id_document_front_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${companyId}/customers/${customerId}`, file.mimetype);
        }
        const updatedCustomerResult = await customerModel_1.default.update({ id: customerId }, {
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
        });
        if (updatedCustomerResult.error) {
            throw new common_1.ConflictException(updatedCustomerResult.error.message);
        }
        const updatedCustomer = updatedCustomerResult.output;
        return this.mapToResponseDto(updatedCustomer);
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
        return {
            data: customers,
        };
    }
    async findAllCustomersWithCardCountByCompany(companyId) {
        const customersResult = await customerModel_1.default.getCustomersWithCardCount({
            company_id: companyId,
            is_active: true,
        });
        if (customersResult.error) {
            throw new common_1.NotFoundException(customersResult.error.message);
        }
        const customers = customersResult.output;
        return {
            data: customers,
        };
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
        return { data: customer };
    }
    async findCustomerCards(companyId, customerId) {
        const customerCardsResult = await cardModel_1.default.get({
            customer_id: customerId,
            company_id: companyId,
        });
        if (customerCardsResult.error || !customerCardsResult.output) {
            throw new common_1.NotFoundException("Customer cards not found");
        }
        const customerCards = customerCardsResult.output;
        return { data: customerCards };
    }
    async findCustomerTransactions(companyId, customerId) {
        const customerTransactionsResult = await transactionModel_1.default.get({
            customer_id: customerId,
            company_id: companyId,
        });
        if (customerTransactionsResult.error ||
            !customerTransactionsResult.output) {
            throw new common_1.NotFoundException("Customer transactions not found");
        }
        const customerTransactions = customerTransactionsResult.output;
        return { data: customerTransactions };
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
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map