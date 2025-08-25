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
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const companyModel_1 = require("../../models/prisma/companyModel");
const userModel_1 = require("../../models/prisma/userModel");
const transactionModel_1 = require("../../models/prisma/transactionModel");
const walletModel_1 = require("../../models/prisma/walletModel");
const roleModel_1 = require("../../models/prisma/roleModel");
const userCompanyRoleModel_1 = require("../../models/prisma/userCompanyRoleModel");
const firebase_service_1 = require("../../services/firebase.service");
const email_service_1 = require("../../services/email.service");
const client_1 = require("@prisma/client");
let CompanyService = class CompanyService {
    constructor(firebaseService, emailService) {
        this.firebaseService = firebaseService;
        this.emailService = emailService;
    }
    async createCompanyUser(createDto) {
        try {
            const [existingUserResult, existingCompanyResult] = await Promise.all([
                userModel_1.default.getOne({ email: createDto.email_user }),
                companyModel_1.default.getOne({ email: createDto.email_company }),
            ]);
            const existingUser = existingUserResult.output;
            const existingCompany = existingCompanyResult.output;
            if (existingUser) {
                throw new common_1.ConflictException("User with this email already exists");
            }
            if (existingCompany) {
                throw new common_1.ConflictException("Company with this email already exists");
            }
            const hashedPassword = await bcrypt.hash(createDto.password_user, 12);
            const clientId = this.generateClientId();
            const clientKey = this.generateClientKey();
            const hashedClientKey = await bcrypt.hash(clientKey, 12);
            const result = await companyModel_1.default.operation(async (prisma) => {
                const companyResult = await companyModel_1.default.create({
                    name: createDto.name_company,
                    country: createDto.country_company,
                    email: createDto.email_company,
                    client_id: clientId,
                    client_key: hashedClientKey,
                });
                if (companyResult.error)
                    throw new common_1.BadRequestException(companyResult.error.message);
                const company = companyResult.output;
                const userResult = await userModel_1.default.create({
                    full_name: createDto.full_name_user,
                    email: createDto.email_user,
                    password: hashedPassword,
                    company_id: company.id,
                });
                if (userResult.error)
                    throw new common_1.BadRequestException(userResult.error.message);
                const user = userResult.output;
                let ownerRoleResult = await roleModel_1.default.getOne({ name: "owner" });
                let ownerRole = ownerRoleResult.output;
                if (!ownerRole) {
                    const roleCreateResult = await roleModel_1.default.create({ name: "owner" });
                    if (roleCreateResult.error)
                        throw new common_1.BadRequestException(roleCreateResult.error.message);
                    ownerRole = roleCreateResult.output;
                }
                const ucrResult = await userCompanyRoleModel_1.default.create({
                    user_id: user.id,
                    company_id: company.id,
                    role_id: ownerRole.id,
                });
                if (ucrResult.error)
                    throw new common_1.BadRequestException(ucrResult.error.message);
                const walletsResult = await Promise.all([
                    walletModel_1.default.create({
                        balance: 0,
                        active: true,
                        currency: "XAF",
                        country: "Cameroon",
                        country_iso_code: "CM",
                        company_id: company.id,
                    }),
                    walletModel_1.default.create({
                        balance: 2000,
                        active: true,
                        currency: "USD",
                        country: "USA",
                        country_iso_code: "USA",
                        company_id: company.id,
                    }),
                ]);
                const wallets = walletsResult.map((w) => w.output);
                return { company, user, wallets };
            });
            return {
                status: true,
                message: "Company and owner user created successfully. Proceed to next step.",
                user: this.mapUserToResponseDto(result.user),
                company: this.mapCompanyToResponseDto(result.company, clientKey),
                wallets: result.wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "Une erreur est survenue lors de l'enregistrement",
                error: error.message,
            });
        }
    }
    async registerPersonalInfo(personalInfoDto, files) {
        try {
            if (personalInfoDto.password !== personalInfoDto.confirm_password) {
                throw new common_1.BadRequestException("Les mots de passe ne correspondent pas");
            }
            const [existingUserByEmail, existingUserByIdNumber] = await Promise.all([
                userModel_1.default.getOne({ email: personalInfoDto.email }),
                userModel_1.default.getOne({ id_number: personalInfoDto.id_number }),
            ]);
            const existingUser = existingUserByEmail.output || existingUserByIdNumber.output;
            if (existingUser) {
                const companyResult = await companyModel_1.default.getOne({
                    id: existingUser.company_id,
                });
                const company = companyResult.output;
                if (company) {
                    return {
                        success: false,
                        message: company.step === 1
                            ? "Cet utilisateur existe déjà et appartient à une entreprise en cours d'enregistrement. Veuillez compléter les informations de l'entreprise existante."
                            : "Cet utilisateur existe déjà et appartient à une entreprise déjà enregistrée.",
                        user_exists: true,
                        company_id: company.id,
                        company_name: company.name,
                        company_step: company.step,
                        action_required: company.step === 1 ? "complete_step_2" : "login",
                    };
                }
            }
            let idDocumentFrontUrl = null;
            let idDocumentBackUrl = null;
            let proofOfAddressUrl = null;
            if (files?.id_document_front?.[0]) {
                const file = files.id_document_front[0];
                idDocumentFrontUrl = await this.firebaseService.uploadFile(file.buffer, `id_front_${Date.now()}.${file.originalname.split(".").pop()}`, `users/${personalInfoDto.email}/documents`, file.mimetype);
            }
            if (files?.id_document_back?.[0]) {
                const file = files.id_document_back[0];
                idDocumentBackUrl = await this.firebaseService.uploadFile(file.buffer, `id_back_${Date.now()}.${file.originalname.split(".").pop()}`, `users/${personalInfoDto.email}/documents`, file.mimetype);
            }
            if (files?.proof_of_address?.[0]) {
                const file = files.proof_of_address[0];
                proofOfAddressUrl = await this.firebaseService.uploadFile(file.buffer, `proof_address_${Date.now()}.${file.originalname.split(".").pop()}`, `users/${personalInfoDto.email}/documents`, file.mimetype);
            }
            const companyResult = await companyModel_1.default.create({
                name: personalInfoDto.company_name,
                country: personalInfoDto.country_of_residence,
                step: 1,
            });
            if (companyResult.error)
                throw new common_1.BadRequestException(companyResult.error.message);
            const company = companyResult.output;
            const userResult = await userModel_1.default.create({
                first_name: personalInfoDto.first_name,
                last_name: personalInfoDto.last_name,
                full_name: `${personalInfoDto.first_name} ${personalInfoDto.last_name}`,
                email: personalInfoDto.email,
                password: personalInfoDto.password,
                company_id: company.id,
                step: 1,
                role_in_company: personalInfoDto.role,
                phone_number: personalInfoDto.phone_number,
                gender: personalInfoDto.gender,
                nationality: personalInfoDto.nationality,
                id_document_type: personalInfoDto.id_document_type,
                id_number: personalInfoDto.id_number,
                id_document_front: idDocumentFrontUrl,
                id_document_back: idDocumentBackUrl,
                country_of_residence: personalInfoDto.country_of_residence,
                state: personalInfoDto.state,
                city: personalInfoDto.city,
                street: personalInfoDto.street,
                postal_code: personalInfoDto.postal_code,
                proof_of_address: proofOfAddressUrl,
                status: client_1.UserStatus.ACTIVE,
            });
            if (userResult.error)
                throw new common_1.BadRequestException(userResult.error.message);
            const user = userResult.output;
            let ownerRoleResult = await roleModel_1.default.getOne({ name: "owner" });
            let ownerRole = ownerRoleResult.output;
            if (!ownerRole) {
                const roleCreateResult = await roleModel_1.default.create({ name: "owner" });
                if (roleCreateResult.error)
                    throw new common_1.BadRequestException(roleCreateResult.error.message);
                ownerRole = roleCreateResult.output;
            }
            const ucrResult = await userCompanyRoleModel_1.default.create({
                user_id: user.id,
                company_id: company.id,
                role_id: ownerRole.id,
            });
            if (ucrResult.error)
                throw new common_1.BadRequestException(ucrResult.error.message);
            return {
                success: true,
                message: "Informations personnelles enregistrées avec succès. Veuillez procéder à l'étape 2.",
                company_id: company.id,
                company_name: company.name,
                user_id: user.id,
                user_name: user.full_name,
                user_email: user.email,
                next_step: 2,
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "Une erreur est survenue lors de l'enregistrement des informations personnelles",
                error: error.message,
            });
        }
    }
    async registerBusinessInfo(businessInfoDto, files) {
        try {
            const companyResult = await companyModel_1.default.getOne({
                id: businessInfoDto.company_id,
            });
            if (companyResult.error || !companyResult.output) {
                throw new common_1.NotFoundException("Entreprise non trouvée ou étape 1 non complétée");
            }
            const company = companyResult.output;
            if (company.step !== 1) {
                throw new common_1.BadRequestException("L'étape 1 doit être complétée avant de procéder à l'étape 2");
            }
            let shareHoldingDocumentUrl = null;
            let incorporationCertificateUrl = null;
            let businessProofOfAddressUrl = null;
            if (files?.share_holding_document?.[0]) {
                const file = files.share_holding_document[0];
                shareHoldingDocumentUrl = await this.firebaseService.uploadFile(file.buffer, `shareholding_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${businessInfoDto.business_name}/documents`, file.mimetype);
            }
            if (files?.incorporation_certificate?.[0]) {
                const file = files.incorporation_certificate[0];
                incorporationCertificateUrl = await this.firebaseService.uploadFile(file.buffer, `incorporation_${Date.now()}.${file.originalname.split(".").pop()}`, `companies/${businessInfoDto.business_name}/documents`, file.mimetype);
            }
            if (files?.proof_of_address?.[0]) {
                const file = files.proof_of_address[0];
                businessProofOfAddressUrl = await this.firebaseService.uploadFile(file.buffer, `business_address_${Date.now()}.${file.originalname
                    .split(".")
                    .pop()}`, `companies/${businessInfoDto.business_name}/documents`, file.mimetype);
            }
            const clientId = this.generateClientId();
            const clientKey = this.generateClientKey();
            const hashedClientKey = await bcrypt.hash(clientKey, 12);
            const updatedCompanyResult = await companyModel_1.default.update(company.id, {
                business_name: businessInfoDto.business_name,
                business_phone_number: businessInfoDto.business_phone_number,
                business_address: businessInfoDto.business_address,
                business_type: businessInfoDto.business_type,
                country_of_operation: businessInfoDto.country_of_operation,
                tax_id_number: businessInfoDto.tax_id_number,
                business_website: businessInfoDto.business_website,
                business_description: businessInfoDto.business_description,
                source_of_funds: businessInfoDto.source_of_funds,
                share_holding_document: shareHoldingDocumentUrl,
                incorporation_certificate: incorporationCertificateUrl,
                business_proof_of_address: businessProofOfAddressUrl,
                email: `${businessInfoDto.business_name
                    .toLowerCase()
                    .replace(/\s+/g, "")}@company.com`,
                client_id: clientId,
                client_key: hashedClientKey,
                step: 2,
            });
            if (updatedCompanyResult.error)
                throw new common_1.BadRequestException(updatedCompanyResult.error.message);
            const updatedCompany = updatedCompanyResult.output;
            const userResult = await userModel_1.default.getOne({ company_id: company.id });
            if (userResult.error || !userResult.output) {
                throw new common_1.BadRequestException("Utilisateur associé non trouvé");
            }
            const user = userResult.output;
            const updatedUserResult = await userModel_1.default.update(user.id, { step: 2 });
            if (updatedUserResult.error)
                throw new common_1.BadRequestException(updatedUserResult.error.message);
            const updatedUser = updatedUserResult.output;
            const walletsResult = await Promise.all([
                walletModel_1.default.create({
                    balance: 0,
                    active: true,
                    currency: "XAF",
                    country: "Cameroon",
                    country_iso_code: "CM",
                    company_id: updatedCompany.id,
                }),
                walletModel_1.default.create({
                    balance: 0,
                    active: true,
                    currency: "USD",
                    country: "USA",
                    country_iso_code: "USA",
                    company_id: updatedCompany.id,
                }),
            ]);
            return {
                success: true,
                message: "Informations de l'entreprise complétées avec succès. Vous pouvez maintenant vous connecter.",
                company_id: company.id,
                company_name: company.business_name || company.name,
                user_id: user.id,
                user_name: user.full_name,
                user_email: user.email,
                next_step: "login",
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "Une erreur est survenue lors de l'enregistrement des informations de l'entreprise",
                error: error.message,
            });
        }
    }
    async getCompanyBalance(companyId) {
        const walletsResult = await walletModel_1.default.get({
            company_id: companyId,
            active: true,
        });
        if (walletsResult.error) {
            throw new common_1.BadRequestException(walletsResult.error.message);
        }
        const wallets = walletsResult.output;
        return {
            data: wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
        };
    }
    async getCompanyTransactions(companyId) {
        const transactionsResult = await transactionModel_1.default.get({
            company_id: companyId,
        });
        if (transactionsResult.error) {
            throw new common_1.BadRequestException(transactionsResult.error.message);
        }
        const transactions = transactionsResult.output;
        return {
            data: transactions,
        };
    }
    async getAllCompanies() {
        const companyResult = await companyModel_1.default.get();
        if (companyResult.error || !companyResult.output) {
            throw new common_1.NotFoundException("Company not found");
        }
        const companies = companyResult.output || [];
        return { companies };
    }
    async getCompanyById(companyId) {
        const companyResult = await companyModel_1.default.getOne({ id: companyId });
        if (companyResult.error || !companyResult.output) {
            throw new common_1.NotFoundException("Company not found");
        }
        const company = companyResult.output;
        return {
            company,
        };
    }
    async updateKybStatus(companyId, updateKybStatusDto) {
        try {
            const companyResult = await companyModel_1.default.getOne({ id: companyId });
            if (companyResult.error || !companyResult.output) {
                throw new common_1.NotFoundException("Company not found");
            }
            const updatedCompanyResult = await companyModel_1.default.update(companyId, {
                kyb_status: updateKybStatusDto.kyb_status,
            });
            if (updatedCompanyResult.error) {
                throw new common_1.BadRequestException(updatedCompanyResult.error.message);
            }
            const updatedCompany = updatedCompanyResult.output;
            return {
                success: true,
                message: `KYB status updated to ${updateKybStatusDto.kyb_status} successfully`,
                company_id: updatedCompany.id,
                kyb_status: updateKybStatusDto.kyb_status,
                updated_at: updatedCompany.updated_at,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "An error occurred while updating KYB status",
                error: error.message,
            });
        }
    }
    generateClientId() {
        const prefix = "client_";
        const randomPart = Math.random().toString(36).substring(2, 15);
        return prefix + randomPart;
    }
    generateClientKey() {
        const length = 32;
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    mapCompanyToResponseDto(company, clientKey) {
        return {
            id: company.id,
            name: company.name,
            country: company.country,
            email: company.email,
            client_id: company.client_id,
            client_key: clientKey || "***hidden***",
            card_price: parseFloat(company.card_price?.toString() || "5.00"),
            card_fund_rate: parseFloat(company.card_fund_rate?.toString() || "1.02"),
            created_at: company.created_at,
            updated_at: company.updated_at,
        };
    }
    mapUserToResponseDto(user) {
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            company_id: user.company_id,
            step: user.step,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }
    mapWalletToResponseDto(wallet) {
        return {
            id: wallet.id,
            balance: parseFloat(wallet.balance.toString()),
            active: wallet.active,
            currency: wallet.currency,
            country: wallet.country,
            country_iso_code: wallet.country_iso_code,
            company_id: wallet.company_id,
            created_at: wallet.created_at,
            updated_at: wallet.updated_at,
        };
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService,
        email_service_1.EmailService])
], CompanyService);
//# sourceMappingURL=company.service.js.map