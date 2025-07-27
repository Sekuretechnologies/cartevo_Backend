import {
  Injectable,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  CreateCompanyUserDto,
  CreateCompanyUserResponseDto,
  CompanyResponseDto,
  UserResponseDto,
  WalletResponseDto,
} from "./dto/company.dto";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import UserModel from "@/models/prisma/userModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import RoleModel from "@/models/prisma/roleModel";
import UserCompanyRoleModel from "@/models/prisma/userCompanyRoleModel";

@Injectable()
export class CompanyService {
  constructor() {}

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

  async getCompanyBalance(
    companyId: string
  ): Promise<{ wallets: WalletResponseDto[] }> {
    const walletsResult = await WalletModel.get({
      company_id: companyId,
      active: true,
    });
    if (walletsResult.error) {
      throw new BadRequestException(walletsResult.error.message);
    }
    const wallets = walletsResult.output;
    return {
      wallets: wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
    };
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
