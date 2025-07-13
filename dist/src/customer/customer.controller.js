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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const customer_service_1 = require("./customer.service");
const customer_dto_1 = require("./dto/customer.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_business_decorator_1 = require("../common/decorators/current-business.decorator");
let CustomerController = class CustomerController {
    constructor(customerService) {
        this.customerService = customerService;
    }
    async create(business, createCustomerDto) {
        return this.customerService.create(business.businessId, createCustomerDto);
    }
    async findAll(business) {
        return this.customerService.findAllByCompany(business.businessId);
    }
    async findOne(business, id) {
        return this.customerService.findOne(business.businessId, id);
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Register new customer',
        description: 'Register a new customer under the business account',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Customer registered successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Customer with this email already exists',
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List all customers',
        description: 'Retrieve all customers registered under the business',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customers retrieved successfully',
        type: [customer_dto_1.CustomerResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer details',
        description: 'Retrieve details of a specific customer',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer details retrieved successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findOne", null);
exports.CustomerController = CustomerController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [customer_service_1.CustomerService])
], CustomerController);
//# sourceMappingURL=customer.controller.js.map