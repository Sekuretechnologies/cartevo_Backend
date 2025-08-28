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
  CompanyUserDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  CurrencyConversionDto,
  CurrencyConversionResponseDto,
  CreateTransactionFeeDto,
  UpdateTransactionFeeDto,
  TransactionFeeResponseDto,
  CalculateTransactionFeeDto,
  CalculateTransactionFeeResponseDto,
  CompleteKycDto,
  CompleteKycResponseDto,
  CompleteKybDto,
  CompleteKybResponseDto,
  BankingInfoDto,
  BankingInfoResponseDto,
  CompleteProfileDto,
  CompleteProfileResponseDto,
  OnboardingStatusDto,
  CreateOnboardingStepDto,
  UpdateOnboardingStepDto,
  OnboardingStepResponseDto,
  OnboardingStepListResponseDto,
  InitializeOnboardingStepsDto,
  InitializeOnboardingStepsResponseDto,
  UpdateStepStatusDto,
  UpdateStepStatusResponseDto,
  GetOnboardingStepsDto,
  GetOnboardingStepsResponseDto,
  CompanyCredentialsResponseDto,
  UpdateWebhookUrlDto,
  UpdateWebhookUrlResponseDto,
  RegenerateClientKeyResponseDto,
} from "./dto/company.dto";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import RoleModel from "@/models/prisma/roleModel";
import UserCompanyRoleModel from "@/models/prisma/userCompanyRoleModel";
import ExchangeRateModel from "@/models/prisma/exchangeRateModel";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import OnboardingStepModel from "@/models/prisma/onboardingStepModel";
import { FirebaseService } from "../../services/firebase.service";
import { EmailService } from "../../services/email.service";
import { UserStatus, StepStatus } from "@prisma/client";
import { Console } from "console";

@Injectable()
export class CompanyService {
  constructor(
    private firebaseService: FirebaseService,
    private emailService: EmailService
  ) {}

  async createCompanyUser(
    createDto: CompanyUserDto
  ): Promise<BusinessInfoResponseDto> {
    try {
      // Step 1-3: Check for pre-existing emails
      const [existingUserResult, existingCompanyResult] = await Promise.all([
        UserModel.getOne({ email: createDto.business_email }),
        CompanyModel.getOne({ email: createDto.business_email }),
      ]);
      const existingUser = existingUserResult.output;
      const existingCompany = existingCompanyResult.output;
      if (existingCompany) {
        throw new ConflictException("Company with this email already exists");
      }
      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }

      // Step 4: Hash user's password
      // const hashedPassword = await bcrypt.hash(createDto.password_user, 12);
      // Step 5: Generate company's client_id and client_key
      const clientId = this.generateClientId();
      const clientKey = this.generateClientKey();
      const hashedClientKey = await bcrypt.hash(clientKey, 12);
      // Use database transaction for atomicity
      // const result = await CompanyModel.operation(async (prisma) => {
      // Step 6: Create company record
      const companyResult = await CompanyModel.create({
        name: createDto.business_name,
        email: createDto.business_email,
        business_type: createDto.business_type,
        country: createDto.business_country,
        country_iso_code: createDto.business_country_iso_code,
        country_phone_code: createDto.business_country_phone_code,
        country_currency: createDto.business_country_currency,
        client_id: clientId,
        client_key: hashedClientKey,
      });
      if (companyResult.error)
        throw new BadRequestException(companyResult.error.message);
      const company = companyResult.output;
      // Step 7: Create user record associated with company
      const userResult = await UserModel.create({
        first_name: createDto.first_name,
        last_name: createDto.last_name,
        email: createDto.business_email,
        password: createDto.password,
        phone_number: createDto.phone_number,
        company_id: company.id,
        status: UserStatus.ACTIVE,
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
          currency: createDto.business_country_currency || "",
          country: createDto.business_country || "",
          country_iso_code: createDto.business_country_iso_code || "",
          company_id: company.id,
        }),
        WalletModel.create({
          balance: 0,
          active: true,
          currency: "USD",
          country: "USA",
          country_iso_code: "US",
          company_id: company.id,
        }),
      ]);
      const wallets = walletsResult.map((w) => w.output);
      // return { company, user, wallets };

      // });
      // Step 10: Create default exchange rates and transaction fees for the company
      try {
        // Create default exchange rate: 1 USD = 650 XAF
        await this.createExchangeRate(company.id, {
          fromCurrency: "USD",
          toCurrency: createDto.business_country_currency || "XAF",
          rate:
            createDto.business_country_currency === "XAF" ||
            createDto.business_country_currency === "XOF"
              ? 650
              : 0,
          source: "DEFAULT",
          description: "Default exchange rate: 1 USD = 650 XAF",
          isActive: true,
        });

        // Create default exchange rate: 1 USD = 650 XOF
        // await this.createExchangeRate(company.id, {
        //   fromCurrency: "USD",
        //   toCurrency: "XOF",
        //   rate: 650,
        //   source: "DEFAULT",
        //   description: "Default exchange rate: 1 USD = 650 XOF",
        //   isActive: true,
        // });

        // Create default transaction fees
        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "PURCHASE",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 1,
          description: "Card purchase fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "FUND",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 0.5,
          description: "Card funding fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "WITHDRAWAL",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 0.3,
          description: "Card withdrawal fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "WALLET",
          transactionCategory: "TOPUP",
          countryIsoCode: "US",
          currency: "USD",
          type: "PERCENTAGE",
          value: 3.6,
          description: "Wallet topup fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "WALLET",
          transactionCategory: "WITHDRAWAL",
          countryIsoCode: "US",
          currency: "USD",
          type: "PERCENTAGE",
          value: 2,
          description: "Wallet withdrawal fee",
        });
      } catch (feeError) {
        console.error("Error creating default fees and rates:", feeError);
        // Don't throw the error to prevent company creation from failing
        // Just log the error and continue
      }

      // Step 10.5: Initialize default onboarding steps
      try {
        await this.initializeOnboardingSteps({ company_id: company.id });
        console.log("Default onboarding steps initialized successfully");
      } catch (stepError) {
        console.error("Error initializing onboarding steps:", stepError);
        // Don't throw the error to prevent company creation from failing
        // Just log the error and continue
      }

      // Step 11: Return success response
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
        name: businessInfoDto.business_name,
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

      // Create default exchange rates and transaction fees for the company
      try {
        // Create default exchange rate: 1 USD = 650 XAF
        await this.createExchangeRate(company.id, {
          fromCurrency: "USD",
          toCurrency: "XAF",
          rate: 650,
          source: "DEFAULT",
          description: "Default exchange rate: 1 USD = 650 XAF",
          isActive: true,
        });

        // Create default transaction fees
        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "PURCHASE",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 1,
          description: "Card purchase fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "FUND",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 0.5,
          description: "Card funding fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "CARD",
          transactionCategory: "WITHDRAWAL",
          countryIsoCode: "US",
          currency: "USD",
          type: "FIXED",
          value: 0.3,
          description: "Card withdrawal fee",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "WALLET",
          transactionCategory: "TOPUP",
          countryIsoCode: "US",
          currency: "USD",
          type: "PERCENTAGE",
          value: 3.6,
          description: "Wallet topup fee (3.6%)",
        });

        await this.createTransactionFee(company.id, {
          transactionType: "WALLET",
          transactionCategory: "WITHDRAWAL",
          countryIsoCode: "US",
          currency: "USD",
          type: "PERCENTAGE",
          value: 2,
          description: "Wallet withdrawal fee (2%)",
        });
      } catch (feeError) {
        console.error("Error creating default fees and rates:", feeError);
        // Don't throw the error to prevent company creation from failing
        // Just log the error and continue
      }

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
      // card_price: parseFloat(company.card_price?.toString() || "5.00"),
      // card_fund_rate: parseFloat(company.card_fund_rate?.toString() || "1.02"),
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

  // ==================== EXCHANGE RATE MANAGEMENT ====================

  /**
   * Create a new exchange rate for a company
   */
  async createExchangeRate(
    companyId: string,
    exchangeRateData: {
      fromCurrency: string;
      toCurrency: string;
      rate: number;
      source?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const result = await ExchangeRateModel.create({
        company_id: companyId,
        from_currency: exchangeRateData.fromCurrency.toUpperCase(),
        to_currency: exchangeRateData.toCurrency.toUpperCase(),
        rate: exchangeRateData.rate,
        source: exchangeRateData.source,
        description: exchangeRateData.description,
        is_active: exchangeRateData.isActive ?? true,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Exchange rate created successfully",
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error creating exchange rate",
        error: error.message,
      });
    }
  }

  /**
   * Get all exchange rates for a company
   */
  async getCompanyExchangeRates(companyId: string) {
    try {
      const result = await ExchangeRateModel.get({ company_id: companyId });
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error fetching exchange rates",
        error: error.message,
      });
    }
  }

  /**
   * Update an exchange rate
   */
  async updateExchangeRate(
    exchangeRateId: string,
    updateData: {
      rate?: number;
      source?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const result = await ExchangeRateModel.update(exchangeRateId, {
        rate: updateData.rate,
        source: updateData.source,
        description: updateData.description,
        is_active: updateData.isActive,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Exchange rate updated successfully",
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error updating exchange rate",
        error: error.message,
      });
    }
  }

  /**
   * Delete an exchange rate
   */
  async deleteExchangeRate(exchangeRateId: string) {
    try {
      const result = await ExchangeRateModel.delete(exchangeRateId);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Exchange rate deleted successfully",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error deleting exchange rate",
        error: error.message,
      });
    }
  }

  /**
   * Convert currency using company's exchange rates
   */
  async convertCurrency(
    companyId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) {
    try {
      const result = await ExchangeRateModel.convertCurrency(
        companyId,
        amount,
        fromCurrency,
        toCurrency
      );

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error converting currency",
        error: error.message,
      });
    }
  }

  // ==================== TRANSACTION FEE MANAGEMENT ====================

  /**
   * Create a new transaction fee for a company
   */
  async createTransactionFee(
    companyId: string,
    feeData: {
      transactionType: string;
      transactionCategory: string;
      countryIsoCode: string;
      currency: string;
      feePercentage?: number;
      feeFixed?: number;
      type: "FIXED" | "PERCENTAGE";
      value: number;
      active?: boolean;
      description?: string;
    }
  ) {
    try {
      const result = await TransactionFeeModel.create({
        company_id: companyId,
        transaction_type: feeData.transactionType.toUpperCase(),
        transaction_category: feeData.transactionCategory.toUpperCase(),
        country_iso_code: feeData.countryIsoCode.toUpperCase(),
        currency: feeData.currency.toUpperCase(),
        fee_percentage: feeData.feePercentage,
        fee_fixed: feeData.feeFixed,
        type: feeData.type,
        value: feeData.value,
        active: feeData.active ?? true,
        description: feeData.description,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Transaction fee created successfully",
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error creating transaction fee",
        error: error.message,
      });
    }
  }

  /**
   * Get all transaction fees for a company
   */
  async getCompanyTransactionFees(companyId: string) {
    try {
      const result = await TransactionFeeModel.get({ company_id: companyId });
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error fetching transaction fees",
        error: error.message,
      });
    }
  }

  /**
   * Update a transaction fee
   */
  async updateTransactionFee(
    feeId: string,
    updateData: {
      feePercentage?: number;
      feeFixed?: number;
      type?: "FIXED" | "PERCENTAGE";
      value?: number;
      active?: boolean;
      description?: string;
    }
  ) {
    try {
      const result = await TransactionFeeModel.update(feeId, {
        fee_percentage: updateData.feePercentage,
        fee_fixed: updateData.feeFixed,
        type: updateData.type,
        value: updateData.value,
        active: updateData.active,
        description: updateData.description,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Transaction fee updated successfully",
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error updating transaction fee",
        error: error.message,
      });
    }
  }

  /**
   * Delete a transaction fee
   */
  async deleteTransactionFee(feeId: string) {
    try {
      const result = await TransactionFeeModel.delete(feeId);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Transaction fee deleted successfully",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error deleting transaction fee",
        error: error.message,
      });
    }
  }

  /**
   * Calculate fee for a transaction
   */
  async calculateTransactionFee(
    companyId: string,
    amount: number,
    transactionType: string,
    transactionCategory: string,
    countryIsoCode: string,
    currency: string
  ) {
    try {
      const result = await TransactionFeeModel.calculateFee(
        companyId,
        amount,
        transactionType,
        transactionCategory,
        countryIsoCode,
        currency
      );

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        data: result.output,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error calculating transaction fee",
        error: error.message,
      });
    }
  }

  // ==================== ADDITIONAL ONBOARDING METHODS ====================

  /**
   * Complete KYC information for a user
   */
  async completeKyc(
    companyId: string,
    kycData: CompleteKycDto,
    files?: {
      id_document_front?: any[];
      id_document_back?: any[];
      proof_of_address?: any[];
    }
  ): Promise<CompleteKycResponseDto> {
    try {
      // Find the user associated with this company
      const userResult = await UserModel.getOne({ company_id: companyId });
      if (userResult.error || !userResult.output) {
        throw new NotFoundException("User not found for this company");
      }

      const user = userResult.output;

      // Upload files to Firebase if provided
      let idDocumentFrontUrl = null;
      let idDocumentBackUrl = null;
      let proofOfAddressUrl = null;

      if (files?.id_document_front?.[0]) {
        const file = files.id_document_front[0];
        idDocumentFrontUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `id_front_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${user.email}/documents`,
          file.mimetype
        );
      }

      if (files?.id_document_back?.[0]) {
        const file = files.id_document_back[0];
        idDocumentBackUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `id_back_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${user.email}/documents`,
          file.mimetype
        );
      }

      if (files?.proof_of_address?.[0]) {
        const file = files.proof_of_address[0];
        proofOfAddressUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `proof_address_${Date.now()}.${file.originalname.split(".").pop()}`,
          `users/${user.email}/documents`,
          file.mimetype
        );
      }

      // Update user with KYC information
      const updatedUserResult = await UserModel.update(user.id, {
        role_in_company: kycData.role_in_company,
        phone_number: kycData.phone_number,
        gender: kycData.gender,
        nationality: kycData.nationality,
        // address: kycData.address,

        status: UserStatus.ACTIVE,
        id_document_type: kycData.id_document_type,
        id_number: kycData.id_number,
        id_document_front: idDocumentFrontUrl,
        id_document_back: idDocumentBackUrl,
        proof_of_address: proofOfAddressUrl,
        country_of_residence: kycData.country_of_residence,
        state: kycData.state,
        city: kycData.city,
        street: kycData.street,
        postal_code: kycData.postal_code,
        kyc_status: "PENDING", // Set to PENDING for review
        // step: user.step + 1, // Increment step to track KYC completion
      });

      if (updatedUserResult.error) {
        throw new BadRequestException(updatedUserResult.error.message);
      }

      const updatedUser = updatedUserResult.output;

      // Update onboarding step status to COMPLETED
      try {
        const stepResult = await OnboardingStepModel.get({
          company_id: companyId,
          slug: "profile_completion",
        });
        if (!stepResult.error && stepResult.output.length > 0) {
          await OnboardingStepModel.updateStatus(
            stepResult.output[0].id,
            StepStatus.COMPLETED
          );
        }
      } catch (stepError) {
        console.error(
          "Error updating onboarding step status for KYC:",
          stepError
        );
        // Don't throw error to prevent main operation from failing
      }

      return {
        success: true,
        message: "KYC information submitted successfully. Awaiting review.",
        user_id: user.id,
        kyc_status: "PENDING",
        next_step: "kyb_completion",
        completed_at: new Date(),
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
        message: "Error completing KYC information",
        error: error.message,
      });
    }
  }

  /**
   * Complete KYB information for a company
   */
  async completeKyb(
    companyId: string,
    kybData: CompleteKybDto,
    files?: {
      share_holding_document?: any[];
      incorporation_certificate?: any[];
      business_proof_of_address?: any[];
    }
  ): Promise<CompleteKybResponseDto> {
    try {
      // Find the company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      const company = companyResult.output;

      // Upload business files to Firebase if provided
      let shareHoldingDocumentUrl = null;
      let incorporationCertificateUrl = null;
      let businessProofOfAddressUrl = null;

      if (files?.share_holding_document?.[0]) {
        const file = files.share_holding_document[0];
        shareHoldingDocumentUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `shareholding_${Date.now()}.${file.originalname.split(".").pop()}`,
          `companies/${company.name}/documents`,
          file.mimetype
        );
      }

      if (files?.incorporation_certificate?.[0]) {
        const file = files.incorporation_certificate[0];
        incorporationCertificateUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `incorporation_${Date.now()}.${file.originalname.split(".").pop()}`,
          `companies/${company.name}/documents`,
          file.mimetype
        );
      }

      if (files?.business_proof_of_address?.[0]) {
        const file = files.business_proof_of_address[0];
        businessProofOfAddressUrl = await this.firebaseService.uploadFile(
          file.buffer,
          `business_address_${Date.now()}.${file.originalname
            .split(".")
            .pop()}`,
          `companies/${company.name}/documents`,
          file.mimetype
        );
      }

      // Update company with KYB information
      const updatedCompanyResult = await CompanyModel.update(companyId, {
        business_phone_number: kybData.business_phone_number,
        business_address: kybData.business_address,
        tax_id_number: kybData.tax_id_number,
        business_website: kybData.business_website,
        business_description: kybData.business_description,
        source_of_funds: kybData.source_of_funds,
        share_holding_document: shareHoldingDocumentUrl,
        incorporation_certificate: incorporationCertificateUrl,
        business_proof_of_address: businessProofOfAddressUrl,
        kyb_status: "PENDING", // Set to PENDING for review
        step: company.step + 1, // Increment step to track KYB completion
      });

      if (updatedCompanyResult.error) {
        throw new BadRequestException(updatedCompanyResult.error.message);
      }

      const updatedCompany = updatedCompanyResult.output;

      // Update onboarding step status to COMPLETED
      try {
        const stepResult = await OnboardingStepModel.get({
          company_id: companyId,
          slug: "kyb_completion",
        });
        if (!stepResult.error && stepResult.output.length > 0) {
          await OnboardingStepModel.updateStatus(
            stepResult.output[0].id,
            StepStatus.COMPLETED
          );
        }
      } catch (stepError) {
        console.error(
          "Error updating onboarding step status for KYB:",
          stepError
        );
        // Don't throw error to prevent main operation from failing
      }

      return {
        success: true,
        message: "KYB information submitted successfully. Awaiting review.",
        company_id: company.id,
        kyb_status: "PENDING",
        next_step: "banking_info",
        completed_at: new Date(),
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
        message: "Error completing KYB information",
        error: error.message,
      });
    }
  }

  /**
   * Add banking information for a company
   */
  async addBankingInfo(
    companyId: string,
    bankingData: BankingInfoDto
  ): Promise<BankingInfoResponseDto> {
    try {
      // Find the company
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      const company = companyResult.output;

      // For now, we'll store banking information in the company model
      // In a real implementation, you might want to create a separate BankingInfo model
      const updatedCompanyResult = await CompanyModel.update(companyId, {
        // Add banking fields to company model temporarily
        // In a real implementation, you'd create a separate BankingInfo model
        bank_account_holder: bankingData.account_holder_name,
        bank_account_number: bankingData.account_number,
        bank_routing_number: bankingData.routing_number,
        bank_name: bankingData.bank_name,
        bank_swift_code: bankingData.swift_code,
        bank_address: bankingData.bank_address,
        bank_country: bankingData.bank_country,
        bank_currency: bankingData.bank_currency,
        step: company.step + 1, // Increment step to track banking info completion
      });

      if (updatedCompanyResult.error) {
        throw new BadRequestException(updatedCompanyResult.error.message);
      }

      // Update onboarding step status to COMPLETED
      try {
        const stepResult = await OnboardingStepModel.get({
          company_id: companyId,
          slug: "banking_info",
        });
        if (!stepResult.error && stepResult.output.length > 0) {
          await OnboardingStepModel.updateStatus(
            stepResult.output[0].id,
            StepStatus.COMPLETED
          );
        }
      } catch (stepError) {
        console.error(
          "Error updating onboarding step status for banking info:",
          stepError
        );
        // Don't throw error to prevent main operation from failing
      }

      return {
        success: true,
        message: "Banking information added successfully",
        company_id: companyId,
        bank_account_id: "banking_info_temp_id", // In real implementation, this would be the actual ID
        next_step: "profile_completion",
        completed_at: new Date(),
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
        message: "Error adding banking information",
        error: error.message,
      });
    }
  }

  /**
   * Complete user profile information
   */
  async completeProfile(
    companyId: string,
    profileData: CompleteProfileDto
  ): Promise<CompleteProfileResponseDto> {
    try {
      // Find the user associated with this company
      const userResult = await UserModel.getOne({ company_id: companyId });
      if (userResult.error || !userResult.output) {
        throw new NotFoundException("User not found for this company");
      }

      const user = userResult.output;

      // Update user with profile information
      const updatedUserResult = await UserModel.update(user.id, {
        // role_in_company: profileData.role,
        phone_number: profileData.phone_number,
        gender: profileData.gender,
        nationality: profileData.nationality,
        // address: profileData.address,
        status: UserStatus.ACTIVE,
        step: user.step + 1, // Increment step to track profile completion
      });

      if (updatedUserResult.error) {
        throw new BadRequestException(updatedUserResult.error.message);
      }

      const updatedUser = updatedUserResult.output;

      // Update onboarding step status to COMPLETED
      try {
        const stepResult = await OnboardingStepModel.get({
          company_id: companyId,
          slug: "profile_completion",
        });
        if (!stepResult.error && stepResult.output.length > 0) {
          await OnboardingStepModel.updateStatus(
            stepResult.output[0].id,
            StepStatus.COMPLETED
          );
        }

        // Check if all steps are completed and update the final step
        const allStepsResult = await OnboardingStepModel.get({
          company_id: companyId,
        });
        if (!allStepsResult.error) {
          const completedSteps = allStepsResult.output.filter(
            (step) => step.status === StepStatus.COMPLETED
          );
          const totalSteps = allStepsResult.output.length;

          // If all but the last step are completed, complete the onboarding
          if (completedSteps.length === totalSteps - 1) {
            const finalStepResult = await OnboardingStepModel.get({
              company_id: companyId,
              slug: "onboarding_complete",
            });
            if (!finalStepResult.error && finalStepResult.output.length > 0) {
              await OnboardingStepModel.updateStatus(
                finalStepResult.output[0].id,
                "COMPLETED"
              );
            }
          }
        }
      } catch (stepError) {
        console.error(
          "Error updating onboarding step status for profile completion:",
          stepError
        );
        // Don't throw error to prevent main operation from failing
      }

      return {
        success: true,
        message: "Profile information completed successfully",
        user_id: user.id,
        company_id: companyId,
        next_step: "onboarding_complete",
        completed_at: new Date(),
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
        message: "Error completing profile information",
        error: error.message,
      });
    }
  }

  /**
   * Get onboarding status for a company and user
   */
  async getOnboardingStatus(
    companyId: string,
    userId: string
  ): Promise<OnboardingStatusDto> {
    try {
      // Find the company and user
      const [companyResult, userResult] = await Promise.all([
        CompanyModel.getOne({ id: companyId }),
        UserModel.getOne({ id: userId }),
      ]);

      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      if (userResult.error || !userResult.output) {
        throw new NotFoundException("User not found");
      }

      const company = companyResult.output;
      const user = userResult.output;

      // Determine completed steps
      const completedSteps: string[] = [];
      let nextStep = "onboarding_complete";
      let isComplete = true;

      // Check KYC status
      if (user.kyc_status !== "NONE" && user.kyc_status !== "PENDING") {
        completedSteps.push("kyc_completed");
      } else {
        nextStep = "kyc_completion";
        isComplete = false;
      }

      // Check KYB status
      if (company.kyb_status !== "NONE" && company.kyb_status !== "PENDING") {
        completedSteps.push("kyb_completed");
      } else if (nextStep === "onboarding_complete") {
        nextStep = "kyb_completion";
        isComplete = false;
      }

      // Check banking info (simplified check)
      const hasBankingInfo =
        company.bank_account_holder && company.bank_account_number;
      if (hasBankingInfo) {
        completedSteps.push("banking_info_completed");
      } else if (nextStep === "onboarding_complete") {
        nextStep = "banking_info";
        isComplete = false;
      }

      // Check profile completion
      const hasProfileInfo =
        user.role_in_company && user.phone_number && user.gender;
      if (hasProfileInfo) {
        completedSteps.push("profile_completed");
      } else if (nextStep === "onboarding_complete") {
        nextStep = "profile_completion";
        isComplete = false;
      }

      return {
        company_id: companyId,
        user_id: userId,
        current_step: Math.max(company.step, user.step),
        completed_steps: completedSteps,
        next_step: nextStep,
        is_complete: isComplete,
        kyc_status: user.kyc_status,
        kyb_status: company.kyb_status,
        banking_info_complete: hasBankingInfo,
        profile_complete: hasProfileInfo,
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
        message: "Error getting onboarding status",
        error: error.message,
      });
    }
  }

  // ==================== ONBOARDING STEP MANAGEMENT ====================

  /**
   * Create a new onboarding step
   */
  async createOnboardingStep(
    stepData: CreateOnboardingStepDto
  ): Promise<OnboardingStepResponseDto> {
    try {
      const result = await OnboardingStepModel.create({
        company_id: stepData.company_id,
        name: stepData.name,
        slug: stepData.slug,
        status: stepData.status || "PENDING",
        order: stepData.order || 0,
        description: stepData.description,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return this.mapOnboardingStepToResponseDto(result.output);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error creating onboarding step",
        error: error.message,
      });
    }
  }

  /**
   * Get all onboarding steps for a company
   */
  async getCompanyOnboardingSteps(
    companyId: string,
    status?: string
  ): Promise<{ data: GetOnboardingStepsResponseDto }> {
    try {
      const where: any = { company_id: companyId };
      if (status) {
        where.status = status;
      }

      const result = await OnboardingStepModel.get(where);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      const steps = result.output.map((step: any) =>
        this.mapOnboardingStepToResponseDto(step)
      );

      // Count by status
      const completedCount = steps.filter(
        (step: any) => step.status === "COMPLETED"
      ).length;
      const pendingCount = steps.filter(
        (step: any) => step.status === "PENDING"
      ).length;
      const inProgressCount = steps.filter(
        (step: any) => step.status === "IN_PROGRESS"
      ).length;
      const failedCount = steps.filter(
        (step: any) => step.status === "FAILED"
      ).length;

      return {
        data: {
          steps,
          total: steps.length,
          completed_count: completedCount,
          pending_count: pendingCount,
          in_progress_count: inProgressCount,
          failed_count: failedCount,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error fetching onboarding steps",
        error: error.message,
      });
    }
  }

  /**
   * Get a single onboarding step
   */
  async getOnboardingStep(stepId: string): Promise<OnboardingStepResponseDto> {
    try {
      const result = await OnboardingStepModel.getOne({ id: stepId });
      if (result.error || !result.output) {
        throw new NotFoundException("Onboarding step not found");
      }

      return this.mapOnboardingStepToResponseDto(result.output);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error fetching onboarding step",
        error: error.message,
      });
    }
  }

  /**
   * Update an onboarding step
   */
  async updateOnboardingStep(
    stepId: string,
    updateData: UpdateOnboardingStepDto
  ): Promise<OnboardingStepResponseDto> {
    try {
      const result = await OnboardingStepModel.update(stepId, {
        name: updateData.name,
        slug: updateData.slug,
        status: updateData.status,
        order: updateData.order,
        description: updateData.description,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return this.mapOnboardingStepToResponseDto(result.output);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error updating onboarding step",
        error: error.message,
      });
    }
  }

  /**
   * Delete an onboarding step
   */
  async deleteOnboardingStep(
    stepId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await OnboardingStepModel.delete(stepId);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "Onboarding step deleted successfully",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error deleting onboarding step",
        error: error.message,
      });
    }
  }

  /**
   * Initialize default onboarding steps for a company
   */
  async initializeOnboardingSteps(
    initData: InitializeOnboardingStepsDto
  ): Promise<InitializeOnboardingStepsResponseDto> {
    try {
      const result = await OnboardingStepModel.initializeDefaultSteps(
        initData.company_id
      );
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      const steps = result.output.map((step) =>
        this.mapOnboardingStepToResponseDto(step)
      );

      return {
        success: true,
        message: "Onboarding steps initialized successfully",
        steps,
        initialized_at: new Date(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error initializing onboarding steps",
        error: error.message,
      });
    }
  }

  /**
   * Update step status
   */
  async updateStepStatus(
    stepId: string,
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  ): Promise<UpdateStepStatusResponseDto> {
    try {
      const result = await OnboardingStepModel.updateStatus(stepId, status);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: `Step status updated to ${status} successfully`,
        step: this.mapOnboardingStepToResponseDto(result.output),
        updated_at: new Date(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error updating step status",
        error: error.message,
      });
    }
  }

  /**
   * Start a step (mark as IN_PROGRESS)
   */
  async startStep(stepId: string): Promise<UpdateStepStatusResponseDto> {
    return this.updateStepStatus(stepId, "IN_PROGRESS");
  }

  /**
   * Complete a step (mark as COMPLETED)
   */
  async completeStep(stepId: string): Promise<UpdateStepStatusResponseDto> {
    return this.updateStepStatus(stepId, "COMPLETED");
  }

  /**
   * Get next pending step for a company
   */
  async getNextPendingStep(
    companyId: string
  ): Promise<OnboardingStepResponseDto | null> {
    try {
      const result = await OnboardingStepModel.getNextPendingStep(companyId);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      if (!result.output) {
        return null;
      }

      return this.mapOnboardingStepToResponseDto(result.output);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error fetching next pending step",
        error: error.message,
      });
    }
  }

  /**
   * Reset all steps for a company
   */
  async resetCompanySteps(
    companyId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await OnboardingStepModel.resetCompanySteps(companyId);
      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      return {
        success: true,
        message: "All onboarding steps reset successfully",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error resetting company steps",
        error: error.message,
      });
    }
  }

  /**
   * Map onboarding step to response DTO
   */
  private mapOnboardingStepToResponseDto(step: any): OnboardingStepResponseDto {
    return {
      id: step.id,
      company_id: step.company_id,
      name: step.name,
      slug: step.slug,
      status: step.status,
      order: step.order,
      description: step.description,
      created_at: step.created_at,
      updated_at: step.updated_at,
    };
  }

  // ==================== CLIENT CREDENTIALS AND WEBHOOK MANAGEMENT ====================

  /**
   * Get company credentials including webhook URL, client ID, and client key
   */
  async getCompanyCredentials(
    companyId: string
  ): Promise<CompanyCredentialsResponseDto> {
    try {
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      const company = companyResult.output;

      return {
        success: true,
        message: "Company credentials retrieved successfully",
        data: {
          webhook_url: company.webhook_url,
          webhook_is_active: company.webhook_is_active,
          client_id: company.client_id,
          client_key: company.client_key, // Return actual client_key for authenticated requests
        },
        // company_id: company.id,
        // updated_at: company.updated_at,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "Error retrieving company credentials",
        error: error.message,
      });
    }
  }

  /**
   * Update company webhook URL
   */
  async updateWebhookUrl(
    companyId: string,
    updateData: UpdateWebhookUrlDto
  ): Promise<UpdateWebhookUrlResponseDto> {
    try {
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      console.log("updateData : ", updateData);

      const updateFields: any = {};
      if (updateData.webhook_url !== undefined) {
        updateFields.webhook_url = updateData.webhook_url;
      }
      if (updateData.webhook_is_active !== undefined) {
        updateFields.webhook_is_active = updateData.webhook_is_active;
      }

      const updatedCompanyResult = await CompanyModel.update(
        companyId,
        updateFields
      );

      if (updatedCompanyResult.error) {
        throw new BadRequestException(updatedCompanyResult.error.message);
      }

      const updatedCompany = updatedCompanyResult.output;

      console.log("updatedCompany ::", {
        success: true,
        message: "Webhook URL updated successfully",
        company_id: updatedCompany.id,
        webhook_url: updatedCompany.webhook_url,
        webhook_is_active: updatedCompany.webhook_is_active,
        updated_at: updatedCompany.updated_at,
      });

      return {
        success: true,
        message: "Webhook URL updated successfully",
        company_id: updatedCompany.id,
        webhook_url: updatedCompany.webhook_url,
        webhook_is_active: updatedCompany.webhook_is_active,
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
        message: "Error updating webhook URL",
        error: error.message,
      });
    }
  }

  /**
   * Regenerate client key for a company
   */
  async regenerateClientKey(
    companyId: string
  ): Promise<RegenerateClientKeyResponseDto> {
    try {
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new NotFoundException("Company not found");
      }

      const company = companyResult.output;

      // Generate new client key
      const newClientKey = this.generateClientKey();
      const hashedClientKey = await bcrypt.hash(newClientKey, 12);

      const updatedCompanyResult = await CompanyModel.update(companyId, {
        client_key: hashedClientKey,
      });

      if (updatedCompanyResult.error) {
        throw new BadRequestException(updatedCompanyResult.error.message);
      }

      const updatedCompany = updatedCompanyResult.output;

      return {
        success: true,
        message: "Client key regenerated successfully",
        company_id: updatedCompany.id,
        new_client_key: newClientKey, // Return the plain text key only once
        client_id: updatedCompany.client_id,
        regenerated_at: updatedCompany.updated_at,
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
        message: "Error regenerating client key",
        error: error.message,
      });
    }
  }
}
