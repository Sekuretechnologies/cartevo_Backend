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
exports.CalculateTransactionFeeResponseDto = exports.CalculateTransactionFeeDto = exports.TransactionFeeResponseDto = exports.UpdateTransactionFeeDto = exports.CreateTransactionFeeDto = exports.CurrencyConversionResponseDto = exports.CurrencyConversionDto = exports.ExchangeRateResponseDto = exports.UpdateExchangeRateDto = exports.CreateExchangeRateDto = exports.OnboardingStatusDto = exports.CompleteProfileResponseDto = exports.CompleteProfileDto = exports.BankingInfoResponseDto = exports.BankingInfoDto = exports.CompleteKybResponseDto = exports.CompleteKybDto = exports.CompleteKycResponseDto = exports.CompleteKycDto = exports.TransactionResponseDto = exports.UpdateKycStatusResponseDto = exports.UpdateKybStatusResponseDto = exports.UpdateKycStatusDto = exports.UpdateKybStatusDto = exports.CheckExistingUserResponseDto = exports.BusinessInfoResponseDto = exports.PersonalInfoResponseDto = exports.ErrorResponseDto = exports.CreateCompanyUserResponseDto = exports.WalletResponseDto = exports.UserResponseDto = exports.CompanyResponseDto = exports.CreateCompanyUserDto = exports.BusinessInfoDto = exports.PersonalInfoDto = exports.CompanyUserDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CompanyUserDto {
}
exports.CompanyUserDto = CompanyUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business name",
        example: "Acme Corporation",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User first name",
        example: "John",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User last name",
        example: "Doe",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Email address",
        example: "john.doe@example.com",
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Phone number",
        example: "123456789",
        minLength: 7,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.Matches)(/^[\d+\-\s]+$/, { message: "Invalid phone number format" }),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business type",
        example: "Fintech",
        minLength: 1,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business country",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business country phone code",
        example: "237",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_country_phone_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business Country ISO 2 code",
        example: "CM",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_country_iso_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "country currency",
        example: "XAF",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "business_country_currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document type",
        example: "NIN",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "id_document_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID number",
        example: "123456789",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "id_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document front image file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompanyUserDto.prototype, "id_document_front", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document back image file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompanyUserDto.prototype, "id_document_back", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country of residence",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "country_of_residence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Password - Must contain at least 8 characters",
        example: "SecurePass123!",
        minLength: 8,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Confirm password",
        example: "SecurePass123!",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CompanyUserDto.prototype, "confirm_password", void 0);
class PersonalInfoDto {
}
exports.PersonalInfoDto = PersonalInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Company name",
        example: "Acme Corporation",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User first name",
        example: "John",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User last name",
        example: "Doe",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User role in company",
        example: "CEO",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Phone number",
        example: "+237123456789",
        minLength: 7,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.Matches)(/^[\d+\-\s]+$/, { message: "Invalid phone number format" }),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Gender",
        example: "Male",
        minLength: 1,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Nationality",
        example: "Cameroonian",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "nationality", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document type",
        example: "NIN",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "id_document_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID number",
        example: "123456789",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "id_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document front image file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], PersonalInfoDto.prototype, "id_document_front", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document back image file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], PersonalInfoDto.prototype, "id_document_back", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country of residence",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "country_of_residence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "State/Region",
        example: "Centre",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "City",
        example: "Yaoundé",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Street address",
        example: "123 Main Street",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "street", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Postal code",
        example: "12345",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "postal_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Proof of address document file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], PersonalInfoDto.prototype, "proof_of_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Email address",
        example: "john.doe@example.com",
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Password - Must contain at least 8 characters",
        example: "SecurePass123!",
        minLength: 8,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Confirm password",
        example: "SecurePass123!",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PersonalInfoDto.prototype, "confirm_password", void 0);
class BusinessInfoDto {
}
exports.BusinessInfoDto = BusinessInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Company ID from step 1",
        example: "company-uuid",
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business name",
        example: "Acme Corporation Ltd",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business phone number",
        example: "+237123456789",
        minLength: 7,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.Matches)(/^[\d+\-\s]+$/, { message: "Invalid phone number format" }),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business address",
        example: "123 Business Street, Yaoundé",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business type",
        example: "Technology",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country of operation",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "country_of_operation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Tax ID number",
        example: "TAX123456789",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "tax_id_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business website URL",
        example: "https://acme.com",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business description",
        example: "Technology company providing software solutions",
        minLength: 10,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(10),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "business_description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source of funds",
        example: "Investment",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BusinessInfoDto.prototype, "source_of_funds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Share holding document file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], BusinessInfoDto.prototype, "share_holding_document", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Incorporation certificate file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], BusinessInfoDto.prototype, "incorporation_certificate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business proof of address file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], BusinessInfoDto.prototype, "proof_of_address", void 0);
class CreateCompanyUserDto {
}
exports.CreateCompanyUserDto = CreateCompanyUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User full name",
        example: "John Doe",
        minLength: 2,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "full_name_user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User email address",
        example: "john.doe@example.com",
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "email_user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User password - Must contain at least 8 characters, one uppercase, one lowercase, one digit, and one special character",
        example: "SecurePass123!",
        minLength: 8,
        maxLength: 32,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(32),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
        message: "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    }),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "password_user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Company name",
        example: "Acme Corporation",
        minLength: 2,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "name_company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Company country",
        example: "Cameroon",
        minLength: 2,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "country_company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Company email address",
        example: "company@acme.com",
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyUserDto.prototype, "email_company", void 0);
class CompanyResponseDto {
}
exports.CompanyResponseDto = CompanyResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "client_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompanyResponseDto.prototype, "client_key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CompanyResponseDto.prototype, "card_price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CompanyResponseDto.prototype, "card_fund_rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CompanyResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CompanyResponseDto.prototype, "updated_at", void 0);
class UserResponseDto {
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "full_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UserResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], UserResponseDto.prototype, "step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "updated_at", void 0);
class WalletResponseDto {
}
exports.WalletResponseDto = WalletResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WalletResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WalletResponseDto.prototype, "balance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], WalletResponseDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WalletResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WalletResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WalletResponseDto.prototype, "country_iso_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], WalletResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WalletResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], WalletResponseDto.prototype, "updated_at", void 0);
class CreateCompanyUserResponseDto {
}
exports.CreateCompanyUserResponseDto = CreateCompanyUserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CreateCompanyUserResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreateCompanyUserResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: UserResponseDto }),
    __metadata("design:type", UserResponseDto)
], CreateCompanyUserResponseDto.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: CompanyResponseDto }),
    __metadata("design:type", CompanyResponseDto)
], CreateCompanyUserResponseDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [WalletResponseDto] }),
    __metadata("design:type", Array)
], CreateCompanyUserResponseDto.prototype, "wallets", void 0);
class ErrorResponseDto {
}
exports.ErrorResponseDto = ErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ErrorResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "error", void 0);
class PersonalInfoResponseDto {
}
exports.PersonalInfoResponseDto = PersonalInfoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PersonalInfoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "user_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PersonalInfoResponseDto.prototype, "user_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PersonalInfoResponseDto.prototype, "next_step", void 0);
class BusinessInfoResponseDto {
}
exports.BusinessInfoResponseDto = BusinessInfoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BusinessInfoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "user_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "user_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BusinessInfoResponseDto.prototype, "next_step", void 0);
class CheckExistingUserResponseDto {
}
exports.CheckExistingUserResponseDto = CheckExistingUserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CheckExistingUserResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CheckExistingUserResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CheckExistingUserResponseDto.prototype, "user_exists", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CheckExistingUserResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CheckExistingUserResponseDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CheckExistingUserResponseDto.prototype, "company_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CheckExistingUserResponseDto.prototype, "action_required", void 0);
class UpdateKybStatusDto {
}
exports.UpdateKybStatusDto = UpdateKybStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "KYB status",
        example: "APPROVED",
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^(NONE|PENDING|APPROVED|REJECTED)$/, {
        message: "KYB status must be one of: NONE, PENDING, APPROVED, REJECTED",
    }),
    __metadata("design:type", String)
], UpdateKybStatusDto.prototype, "kyb_status", void 0);
class UpdateKycStatusDto {
}
exports.UpdateKycStatusDto = UpdateKycStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "KYC status",
        example: "APPROVED",
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^(NONE|PENDING|APPROVED|REJECTED)$/, {
        message: "KYC status must be one of: NONE, PENDING, APPROVED, REJECTED",
    }),
    __metadata("design:type", String)
], UpdateKycStatusDto.prototype, "kyc_status", void 0);
class UpdateKybStatusResponseDto {
}
exports.UpdateKybStatusResponseDto = UpdateKybStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], UpdateKybStatusResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKybStatusResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKybStatusResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKybStatusResponseDto.prototype, "kyb_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], UpdateKybStatusResponseDto.prototype, "updated_at", void 0);
class UpdateKycStatusResponseDto {
}
exports.UpdateKycStatusResponseDto = UpdateKycStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], UpdateKycStatusResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKycStatusResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKycStatusResponseDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], UpdateKycStatusResponseDto.prototype, "kyc_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], UpdateKycStatusResponseDto.prototype, "updated_at", void 0);
class TransactionResponseDto {
}
exports.TransactionResponseDto = TransactionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "card_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "card_balance_before", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "card_balance_after", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "wallet_balance_before", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "wallet_balance_after", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], TransactionResponseDto.prototype, "created_at", void 0);
class CompleteKycDto {
}
exports.CompleteKycDto = CompleteKycDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document type",
        example: "PASSPORT",
        enum: ["NIN", "PASSPORT", "VOTERS_CARD", "DRIVERS_LICENSE"],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^(NIN|PASSPORT|VOTERS_CARD|DRIVERS_LICENSE)$/, {
        message: "ID document type must be one of: NIN, PASSPORT, VOTERS_CARD, DRIVERS_LICENSE",
    }),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "id_document_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID number",
        example: "123456789",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "id_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document front image file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompleteKycDto.prototype, "id_document_front", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "ID document back image file (optional)",
        type: "string",
        format: "binary",
        required: false,
    }),
    __metadata("design:type", Object)
], CompleteKycDto.prototype, "id_document_back", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Proof of address document file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompleteKycDto.prototype, "proof_of_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country of residence",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "country_of_residence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "State/Region",
        example: "Centre",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "City",
        example: "Yaoundé",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Street address",
        example: "123 Main Street",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "street", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Postal code",
        example: "12345",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKycDto.prototype, "postal_code", void 0);
class CompleteKycResponseDto {
}
exports.CompleteKycResponseDto = CompleteKycResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CompleteKycResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "kyc_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKycResponseDto.prototype, "next_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CompleteKycResponseDto.prototype, "completed_at", void 0);
class CompleteKybDto {
}
exports.CompleteKybDto = CompleteKybDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business phone number",
        example: "+237123456789",
        minLength: 7,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.Matches)(/^[\d+\-\s]+$/, { message: "Invalid phone number format" }),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "business_phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business address",
        example: "123 Business Street, Yaoundé",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "business_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Tax ID number",
        example: "TAX123456789",
        minLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "tax_id_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business website URL",
        example: "https://acme.com",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "business_website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business description",
        example: "Technology company providing software solutions",
        minLength: 10,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(10),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "business_description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source of funds",
        example: "Investment",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteKybDto.prototype, "source_of_funds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Share holding document file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompleteKybDto.prototype, "share_holding_document", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Incorporation certificate file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompleteKybDto.prototype, "incorporation_certificate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Business proof of address file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], CompleteKybDto.prototype, "business_proof_of_address", void 0);
class CompleteKybResponseDto {
}
exports.CompleteKybResponseDto = CompleteKybResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CompleteKybResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKybResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKybResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKybResponseDto.prototype, "kyb_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteKybResponseDto.prototype, "next_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CompleteKybResponseDto.prototype, "completed_at", void 0);
class BankingInfoDto {
}
exports.BankingInfoDto = BankingInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank account holder name",
        example: "Acme Corporation",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "account_holder_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank account number",
        example: "1234567890",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "account_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank routing number",
        example: "021000021",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "routing_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank name",
        example: "Bank of Africa",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "bank_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank SWIFT code",
        example: "BOACMCMXXX",
        minLength: 8,
        maxLength: 11,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(11),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "swift_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Bank address",
        example: "123 Bank Street, Yaoundé",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "bank_address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country of bank",
        example: "Cameroon",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "bank_country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Currency of bank account",
        example: "XAF",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], BankingInfoDto.prototype, "bank_currency", void 0);
class BankingInfoResponseDto {
}
exports.BankingInfoResponseDto = BankingInfoResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BankingInfoResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BankingInfoResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BankingInfoResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BankingInfoResponseDto.prototype, "bank_account_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BankingInfoResponseDto.prototype, "next_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], BankingInfoResponseDto.prototype, "completed_at", void 0);
class CompleteProfileDto {
}
exports.CompleteProfileDto = CompleteProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User role in company",
        example: "CEO",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteProfileDto.prototype, "role_in_company", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User phone number",
        example: "+237123456789",
        minLength: 7,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.Matches)(/^[\d+\-\s]+$/, { message: "Invalid phone number format" }),
    __metadata("design:type", String)
], CompleteProfileDto.prototype, "phone_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User gender",
        example: "Male",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteProfileDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User nationality",
        example: "Cameroonian",
        minLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CompleteProfileDto.prototype, "nationality", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "User address",
        example: "123 Main Street, Yaoundé",
        minLength: 5,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], CompleteProfileDto.prototype, "address", void 0);
class CompleteProfileResponseDto {
}
exports.CompleteProfileResponseDto = CompleteProfileResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], CompleteProfileResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteProfileResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteProfileResponseDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteProfileResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CompleteProfileResponseDto.prototype, "next_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], CompleteProfileResponseDto.prototype, "completed_at", void 0);
class OnboardingStatusDto {
}
exports.OnboardingStatusDto = OnboardingStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OnboardingStatusDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OnboardingStatusDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], OnboardingStatusDto.prototype, "current_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], OnboardingStatusDto.prototype, "completed_steps", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OnboardingStatusDto.prototype, "next_step", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], OnboardingStatusDto.prototype, "is_complete", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OnboardingStatusDto.prototype, "kyc_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], OnboardingStatusDto.prototype, "kyb_status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], OnboardingStatusDto.prototype, "banking_info_complete", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], OnboardingStatusDto.prototype, "profile_complete", void 0);
class CreateExchangeRateDto {
}
exports.CreateExchangeRateDto = CreateExchangeRateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source currency code",
        example: "USD",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateExchangeRateDto.prototype, "fromCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Target currency code",
        example: "EUR",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateExchangeRateDto.prototype, "toCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Exchange rate value",
        example: 0.85,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateExchangeRateDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source of the exchange rate",
        example: "ECB",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExchangeRateDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Description of the exchange rate",
        example: "USD to EUR exchange rate",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExchangeRateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Whether the exchange rate is active",
        example: true,
        required: false,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateExchangeRateDto.prototype, "isActive", void 0);
class UpdateExchangeRateDto {
}
exports.UpdateExchangeRateDto = UpdateExchangeRateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Exchange rate value",
        example: 0.87,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], UpdateExchangeRateDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source of the exchange rate",
        example: "ECB",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateExchangeRateDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Description of the exchange rate",
        example: "Updated USD to EUR exchange rate",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateExchangeRateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Whether the exchange rate is active",
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateExchangeRateDto.prototype, "isActive", void 0);
class ExchangeRateResponseDto {
}
exports.ExchangeRateResponseDto = ExchangeRateResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "from_currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "to_currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ExchangeRateResponseDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ExchangeRateResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ExchangeRateResponseDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ExchangeRateResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ExchangeRateResponseDto.prototype, "updated_at", void 0);
class CurrencyConversionDto {
}
exports.CurrencyConversionDto = CurrencyConversionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Amount to convert",
        example: 100,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CurrencyConversionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Source currency code",
        example: "USD",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CurrencyConversionDto.prototype, "fromCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Target currency code",
        example: "EUR",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CurrencyConversionDto.prototype, "toCurrency", void 0);
class CurrencyConversionResponseDto {
}
exports.CurrencyConversionResponseDto = CurrencyConversionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CurrencyConversionResponseDto.prototype, "convertedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CurrencyConversionResponseDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CurrencyConversionResponseDto.prototype, "exchangeRateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CurrencyConversionResponseDto.prototype, "fromCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CurrencyConversionResponseDto.prototype, "toCurrency", void 0);
class CreateTransactionFeeDto {
}
exports.CreateTransactionFeeDto = CreateTransactionFeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Transaction type",
        example: "FUND",
        minLength: 2,
        maxLength: 20,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "transactionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Transaction category",
        example: "CARD",
        minLength: 2,
        maxLength: 20,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "transactionCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country ISO code",
        example: "US",
        minLength: 2,
        maxLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(2),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "countryIsoCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Currency code",
        example: "USD",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee percentage (optional)",
        example: 2.5,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTransactionFeeDto.prototype, "feePercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fixed fee amount (optional)",
        example: 0.5,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTransactionFeeDto.prototype, "feeFixed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee type",
        example: "PERCENTAGE",
        enum: ["FIXED", "PERCENTAGE"],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(["FIXED", "PERCENTAGE"]),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee value",
        example: 2.5,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTransactionFeeDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Whether the fee is active",
        example: true,
        required: false,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTransactionFeeDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Description of the fee",
        example: "Card funding fee for US",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionFeeDto.prototype, "description", void 0);
class UpdateTransactionFeeDto {
}
exports.UpdateTransactionFeeDto = UpdateTransactionFeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee percentage (optional)",
        example: 3.0,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTransactionFeeDto.prototype, "feePercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fixed fee amount (optional)",
        example: 1.0,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTransactionFeeDto.prototype, "feeFixed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee type",
        example: "PERCENTAGE",
        enum: ["FIXED", "PERCENTAGE"],
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(["FIXED", "PERCENTAGE"]),
    __metadata("design:type", String)
], UpdateTransactionFeeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Fee value",
        example: 3.0,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTransactionFeeDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Whether the fee is active",
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTransactionFeeDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Description of the fee",
        example: "Updated card funding fee for US",
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTransactionFeeDto.prototype, "description", void 0);
class TransactionFeeResponseDto {
}
exports.TransactionFeeResponseDto = TransactionFeeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "company_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "transaction_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "transaction_category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "country_iso_code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionFeeResponseDto.prototype, "fee_percentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionFeeResponseDto.prototype, "fee_fixed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TransactionFeeResponseDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], TransactionFeeResponseDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TransactionFeeResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], TransactionFeeResponseDto.prototype, "created_at", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], TransactionFeeResponseDto.prototype, "updated_at", void 0);
class CalculateTransactionFeeDto {
}
exports.CalculateTransactionFeeDto = CalculateTransactionFeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Transaction amount",
        example: 1000,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CalculateTransactionFeeDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Transaction type",
        example: "FUND",
        minLength: 2,
        maxLength: 20,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CalculateTransactionFeeDto.prototype, "transactionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Transaction category",
        example: "CARD",
        minLength: 2,
        maxLength: 20,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CalculateTransactionFeeDto.prototype, "transactionCategory", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Country ISO code",
        example: "US",
        minLength: 2,
        maxLength: 2,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(2),
    __metadata("design:type", String)
], CalculateTransactionFeeDto.prototype, "countryIsoCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "Currency code",
        example: "USD",
        minLength: 3,
        maxLength: 3,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CalculateTransactionFeeDto.prototype, "currency", void 0);
class CalculateTransactionFeeResponseDto {
}
exports.CalculateTransactionFeeResponseDto = CalculateTransactionFeeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CalculateTransactionFeeResponseDto.prototype, "feeAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CalculateTransactionFeeResponseDto.prototype, "feeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CalculateTransactionFeeResponseDto.prototype, "feeValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CalculateTransactionFeeResponseDto.prototype, "calculatedPercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], CalculateTransactionFeeResponseDto.prototype, "calculatedFixed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CalculateTransactionFeeResponseDto.prototype, "transactionFeeId", void 0);
//# sourceMappingURL=company.dto.js.map