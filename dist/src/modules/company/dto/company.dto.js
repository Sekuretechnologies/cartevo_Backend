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
exports.UpdateKycStatusResponseDto = exports.UpdateKybStatusResponseDto = exports.UpdateKycStatusDto = exports.UpdateKybStatusDto = exports.CheckExistingUserResponseDto = exports.BusinessInfoResponseDto = exports.PersonalInfoResponseDto = exports.ErrorResponseDto = exports.CreateCompanyUserResponseDto = exports.WalletResponseDto = exports.UserResponseDto = exports.CompanyResponseDto = exports.CreateCompanyUserDto = exports.BusinessInfoDto = exports.PersonalInfoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
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
    (0, class_validator_1.IsUrl)({}, { message: "Enter a valid URL for the website" }),
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
__decorate([
    (0, swagger_1.ApiProperty)({
        description: "MEMART document file",
        type: "string",
        format: "binary",
    }),
    __metadata("design:type", Object)
], BusinessInfoDto.prototype, "memart", void 0);
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
//# sourceMappingURL=company.dto.js.map