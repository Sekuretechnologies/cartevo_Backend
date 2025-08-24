import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  CreateCompanyUserDto,
  CreateCompanyUserResponseDto,
  CompanyResponseDto,
  UserResponseDto,
  WalletResponseDto,
  PersonalInfoDto,
  PersonalInfoResponseDto,
  BusinessInfoDto,
  BusinessInfoResponseDto,
  CheckExistingUserResponseDto,
  UpdateKybStatusDto,
  UpdateKybStatusResponseDto,
  TransactionResponseDto,
} from "./dto/company.dto";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import RoleModel from "@/models/prisma/roleModel";
import UserCompanyRoleModel from "@/models/prisma/userCompanyRoleModel";
import { FirebaseService } from "../../services/firebase.service";
import { EmailService } from "../../services/email.service";
import { UserStatus } from "@prisma/client";

@Injectable()
export class CompanyService {
  constructor(
    private firebaseService: FirebaseService,
    private emailService: EmailService
  ) {}

  async createCompanyUser(
    createDto: CreateCompanyUserDto
  ): Promise<CreateCompanyUserResponseDto> {
    try {
      // Step 1-3: Check for pre-existing emails
      const [existingUserResult, existingCompanyResult] = await Promise.all([
        UserModel.getOne({ email: createDto.email_user }),
        CompanyModel.getOne({ email: createDto.email_company }),
      ]);
      const existingUser = existingUserResult.output;
      const existingCompany = existingCompanyResult.output;
      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }
      if (existingCompany) {
        throw new ConflictException("Company with this email already exists");
      }
      // Step 4: Hash user's password
      const hashedPassword = await bcrypt.hash(createDto.password_user, 12);
      // Step 5: Generate company's client_id and client_key
      const clientId = this.generateClientId();
      const clientKey = this.generateClientKey();
      const hashedClientKey = await bcrypt.hash(clientKey, 12);
      // Use database transaction for atomicity
      const result = await CompanyModel.operation(async (prisma) => {
        // Step 6: Create company record
        const companyResult = await CompanyModel.create({
          name: createDto.name_company,
          country: createDto.country_company,
          email: createDto.email_company,
          client_id: clientId,
          client_key: hashedClientKey,
        });
        if (companyResult.error)
          throw new BadRequestException(companyResult.error.message);
        const company = companyResult.output;
        // Step 7: Create user record associated with company
        const userResult = await UserModel.create({
          full_name: createDto.full_name_user,
          email: createDto.email_user,
          password: hashedPassword,
          company_id: company.id,
        });
        if (userResult.error)
          throw new BadRequestException(userResult.error.message);
        const user = userResult.output;
        // Step 8: Assign 'owner' role to user for this company
        let ownerRoleResult = await RoleModel.getOne({ name: "owner" });
        let ownerRole = ownerRoleResult.output;
        if (!ownerRole) {
          const roleCreateResult = await RoleModel.create({ name: "owner" });
          if (roleCreateResult.error)
            throw new BadRequestException(roleCreateResult.error.message);
          ownerRole = roleCreateResult.output;
        }
        // Create user-company-role association
        const ucrResult = await UserCompanyRoleModel.create({
          user_id: user.id,
          company_id: company.id,
          role_id: ownerRole.id,
        });
        if (ucrResult.error)
          throw new BadRequestException(ucrResult.error.message);
        // Step 9: Create default wallets for the company
        const walletsResult = await Promise.all([
          WalletModel.create({
            balance: 0,
            active: true,
            currency: "XAF",
            country: "Cameroon",
            country_iso_code: "CM",
            company_id: company.id,
          }),
          WalletModel.create({
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
      // Step 10: Return success response
      return {
        status: true,
        message:
          "Company and owner user created successfully. Proceed to next step.",
        user: this.mapUserToResponseDto(result.user),
        company: this.mapCompanyToResponseDto(result.company, clientKey), // Include raw client_key in response
        wallets: result.wallets.map((wallet) =>
          this.mapWalletToResponseDto(wallet)
        ),
      };
    } catch (error) {
      // Handle known validation errors
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle any unexpected errors
      throw new BadRequestException({
        success: false,
        message: "Une erreur est survenue lors de l'enregistrement",
        error: error.message,
      });
    }
  }

  async registerPersonalInfo(
    personalInfoDto: PersonalInfoDto,
    files?: {
      id_document_front?: any[];
      id_document_back?: any[];
      proof_of_address?: any[];
    }
  ): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto> {
    try {
      // Validate password confirmation
      if (personalInfoDto.password !== personalInfoDto.confirm_password) {
        throw new BadRequestException("Les mots de passe ne correspondent pas");
      }

      // Check if user already exists by email or ID number
      const [existingUserByEmail, existingUserByIdNumber] = await Promise.all([
        UserModel.getOne({ email: personalInfoDto.email }),
        UserModel.getOne({ id_number: personalInfoDto.id_number }),
      ]);

      const existingUser =
        existingUserByEmail.output || existingUserByIdNumber.output;

      if (existingUser) {
        // Check if user belongs to an existing company
        const companyResult = await CompanyModel.getOne({
          id: existingUser.company_id,
        });
        const company = companyResult.output;

        if (company) {
          return {
            success: false,
            message:
              company.step === 1
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

      // // Hash password
      // const hashedPassword = await bcrypt.hash(personalInfoDto.password, 12);

      // Upload files to Firebase if provided
      let idDocumentFrontUrl = null;
      let idDocumentBackUrl = null;
      let proofOfAddressUrl = null;

      if (files?.id_document_front?.[0]) {
        const file = files.id_document_front[0];
        idDocumentFrontUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `id_front_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${personalInfoDto.email}/documents`,
          file.mimetype
        );
      }

      if (files?.id_document_back?.[0]) {
        const file = files.id_document_back[0];
        idDocumentBackUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `id_back_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${personalInfoDto.email}/documents`,
          file.mimetype
        );
      }

      if (files?.proof_of_address?.[0]) {
        const file = files.proof_of_address[0];
        proofOfAddressUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `proof_address_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${personalInfoDto.email}/documents`,
          file.mimetype
        );
      }

      // Use database transaction for atomicity
      // const result = await CompanyModel.operation(async (prisma) => {
      // Step 1: Create company with basic information
      const companyResult = await CompanyModel.create({
        name: personalInfoDto.company_name,
        country: personalInfoDto.country_of_residence,
        step: 1, // Step 1 completed
      });
      if (companyResult.error)
        throw new BadRequestException(companyResult.error.message);
      const company = companyResult.output;

      // Step 2: Create user with personal information
      const userResult = await UserModel.create({
        first_name: personalInfoDto.first_name,
        last_name: personalInfoDto.last_name,
        full_name: `${personalInfoDto.first_name} ${personalInfoDto.last_name}`,
        email: personalInfoDto.email,
        password: personalInfoDto.password,
        company_id: company.id,
        step: 1, // Step 1 completed
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
        status: UserStatus.ACTIVE,
      });
      if (userResult.error)
        throw new BadRequestException(userResult.error.message);
      const user = userResult.output;

      // Step 3: Assign 'owner' role to user for this company
      let ownerRoleResult = await RoleModel.getOne({ name: "owner" });
      let ownerRole = ownerRoleResult.output;
      if (!ownerRole) {
        const roleCreateResult = await RoleModel.create({ name: "owner" });
        if (roleCreateResult.error)
          throw new BadRequestException(roleCreateResult.error.message);
        ownerRole = roleCreateResult.output;
      }

      // Create user-company-role association
      const ucrResult = await UserCompanyRoleModel.create({
        user_id: user.id,
        company_id: company.id,
        role_id: ownerRole.id,
      });
      if (ucrResult.error)
        throw new BadRequestException(ucrResult.error.message);

      // return { company, user };
      // });

      return {
        success: true,
        message:
          "Informations personnelles enregistrées avec succès. Veuillez procéder à l'étape 2.",
        company_id: company.id,
        company_name: company.name,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        next_step: 2,
      };
      // return {
      //   success: true,
      //   message:
      //     "Informations personnelles enregistrées avec succès. Veuillez procéder à l'étape 2.",
      //   company_id: result.company.id,
      //   company_name: result.company.name,
      //   user_id: result.user.id,
      //   user_name: result.user.full_name,
      //   user_email: result.user.email,
      //   next_step: 2,
      // };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException({
        success: false,
        message:
          "Une erreur est survenue lors de l'enregistrement des informations personnelles",
        error: error.message,
      });
    }
  }

  async registerBusinessInfo(
    businessInfoDto: BusinessInfoDto,
    files?: {
      share_holding_document?: any[];
      incorporation_certificate?: any[];
      proof_of_address?: any[];
      memart?: any[];
    }
  ): Promise<BusinessInfoResponseDto> {
    try {
      // Find the company
      const companyResult = await CompanyModel.getOne({
        id: businessInfoDto.company_id,
      });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException(
          "Entreprise non trouvée ou étape 1 non complétée"
        );
      }

      const company = companyResult.output;

      // Check if company is at step 1
      if (company.step !== 1) {
        throw new BadRequestException(
          "L'étape 1 doit être complétée avant de procéder à l'étape 2"
        );
      }

      // Upload business files to Firebase if provided
      let shareHoldingDocumentUrl = null;
      let incorporationCertificateUrl = null;
      let businessProofOfAddressUrl = null;
      // let memartUrl = null;

      if (files?.share_holding_document?.[0]) {
        const file = files.share_holding_document[0];
        shareHoldingDocumentUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `shareholding_${Date.now()}.${file.originalname.split(".").pop()}`,
          `companies/${businessInfoDto.business_name}/documents`,
          file.mimetype
        );
      }

      if (files?.incorporation_certificate?.[0]) {
        const file = files.incorporation_certificate[0];
        incorporationCertificateUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `incorporation_${Date.now()}.${file.originalname.split(".").pop()}`,
          `companies/${businessInfoDto.business_name}/documents`,
          file.mimetype
        );
      }

      if (files?.proof_of_address?.[0]) {
        const file = files.proof_of_address[0];
        businessProofOfAddressUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `business_address_${Date.now()}.${file.originalname
            .split(".")
            .pop()}`,
          `companies/${businessInfoDto.business_name}/documents`,
          file.mimetype
        );
      }

      // if (files?.memart?.[0]) {
      //   const file = files.memart[0];
      //   memartUrl = await this.firebaseService.uploadFile(
      //     file.buffer,
      //     `memart_${Date.now()}.${file.originalname.split(".").pop()}`,
      //     `companies/${businessInfoDto.business_name}/documents`,
      //     file.mimetype
      //   );
      // }

      // Generate client credentials
      const clientId = this.generateClientId();
      const clientKey = this.generateClientKey();
      const hashedClientKey = await bcrypt.hash(clientKey, 12);

      // // Use database transaction for atomicity
      // const result = await CompanyModel.operation(async (prisma) => {
      // Update company with business information
      const updatedCompanyResult = await CompanyModel.update(company.id, {
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
        // memart: memartUrl,
        email: `${businessInfoDto.business_name
          .toLowerCase()
          .replace(/\s+/g, "")}@company.com`, // Generate company email
        client_id: clientId,
        client_key: hashedClientKey,
        step: 2, // Step 2 completed
      });
      if (updatedCompanyResult.error)
        throw new BadRequestException(updatedCompanyResult.error.message);
      const updatedCompany = updatedCompanyResult.output;

      // Get the user associated with this company
      const userResult = await UserModel.getOne({ company_id: company.id });
      if (userResult.error || !userResult.output) {
        throw new BadRequestException("Utilisateur associé non trouvé");
      }
      const user = userResult.output;

      // Update user step to 2
      const updatedUserResult = await UserModel.update(user.id, { step: 2 });
      if (updatedUserResult.error)
        throw new BadRequestException(updatedUserResult.error.message);
      const updatedUser = updatedUserResult.output;

      // Create default wallets for the company
      const walletsResult = await Promise.all([
        WalletModel.create({
          balance: 0,
          active: true,
          currency: "XAF",
          country: "Cameroon",
          country_iso_code: "CM",
          company_id: updatedCompany.id,
        }),
        WalletModel.create({
          balance: 0,
          active: true,
          currency: "USD",
          country: "USA",
          country_iso_code: "USA",
          company_id: updatedCompany.id,
        }),
      ]);

      //   return { company: updatedCompany, user: updatedUser };
      // });

      return {
        success: true,
        message:
          "Informations de l'entreprise complétées avec succès. Vous pouvez maintenant vous connecter.",
        company_id: company.id,
        company_name: company.business_name || company.name,
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        next_step: "login",
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException({
        success: false,
        message:
          "Une erreur est survenue lors de l'enregistrement des informations de l'entreprise",
        error: error.message,
      });
    }
  }

  async getCompanyBalance(
    companyId: string
  ): Promise<{ data: WalletResponseDto[] }> {
    const walletsResult = await WalletModel.get({
      company_id: companyId,
      active: true,
    });
    if (walletsResult.error) {
      throw new BadRequestException(walletsResult.error.message);
    }
    const wallets = walletsResult.output;
    return {
      data: wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
    };
  }

  async getCompanyTransactions(
    companyId: string
  ): Promise<{ data: TransactionResponseDto[] }> {
    const transactionsResult = await TransactionModel.get({
      company_id: companyId,
    });
    if (transactionsResult.error) {
      throw new BadRequestException(transactionsResult.error.message);
    }
    const transactions = transactionsResult.output;

    return {
      data: transactions,
    };
    //   return {
    //     transactions: transactions.map((transaction) => ({
    //       id: transaction.id,
    //       category: transaction.category,
    //       type: transaction.type,
    //       card_id: transaction.card_id,
    //       card_balance_before: transaction.card_balance_before.toNumber(),
    //       card_balance_after: transaction.card_balance_after.toNumber(),
    //       wallet_balance_before: transaction.wallet_balance_before.toNumber(),
    //       wallet_balance_after: transaction.wallet_balance_after.toNumber(),
    //       amount: transaction.amount.toNumber(),
    //       currency: transaction.currency,
    //       status: transaction.status,
    //       // reference: transaction.reference,
    //       created_at: transaction.createdAt,
    //     })),
    //   };
  }

  async getAllCompanies(): Promise<{ companies: any[] }> {
    const companyResult = await CompanyModel.get();
    if (companyResult.error || !companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    const companies = companyResult.output || [];
    return { companies };
  }

  async getCompanyById(companyId: string): Promise<{ company: any }> {
    const companyResult = await CompanyModel.getOne({ id: companyId });
    if (companyResult.error || !companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    const company = companyResult.output;
    return {
      company,
    };
  }

  async updateKybStatus(
    companyId: string,
    updateKybStatusDto: UpdateKybStatusDto
  ): Promise<UpdateKybStatusResponseDto> {
    try {
      // Find the company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      // Update the KYB status
      const updatedCompanyResult = await CompanyModel.update(companyId, {
        kyb_status: updateKybStatusDto.kyb_status as any,
      });
      if (updatedCompanyResult.error) {
        throw new BadRequestException(updatedCompanyResult.error.message);
      }

      const updatedCompany = updatedCompanyResult.output;

      return {
        success: true,
        message: `KYB status updated to ${updateKybStatusDto.kyb_status} successfully`,
        company_id: updatedCompany.id,
        kyb_status: updateKybStatusDto.kyb_status,
        updated_at: updatedCompany.updated_at,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException({
        success: false,
        message: "An error occurred while updating KYB status",
        error: error.message,
      });
    }
  }

  private generateClientId(): string {
    const prefix = "client_";
    const randomPart = Math.random().toString(36).substring(2, 15);
    return prefix + randomPart;
  }

  private generateClientKey(): string {
    const length = 32;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
  }

  private mapCompanyToResponseDto(
    company: any,
    clientKey?: string
  ): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      country: company.country,
      email: company.email,
      client_id: company.client_id,
      client_key: clientKey || "***hidden***", // Only show raw key during creation
      card_price: parseFloat(company.card_price?.toString() || "5.00"),
      card_fund_rate: parseFloat(company.card_fund_rate?.toString() || "1.02"),
      created_at: company.created_at,
      updated_at: company.updated_at,
    };
  }

  private mapUserToResponseDto(user: any): UserResponseDto {
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

  private mapWalletToResponseDto(wallet: any): WalletResponseDto {
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
}
