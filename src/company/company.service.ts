import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateCompanyUserDto,
  CreateCompanyUserResponseDto,
  CompanyResponseDto,
  UserResponseDto,
  WalletResponseDto
} from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async createCompanyUser(createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto> {
    try {
      // Step 1-3: Check for pre-existing emails
      const [existingUser, existingCompany] = await Promise.all([
        this.prisma.user.findUnique({
          where: { email: createDto.email_user },
        }),
        this.prisma.company.findUnique({
          where: { email: createDto.email_company },
        }),
      ]);

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      if (existingCompany) {
        throw new ConflictException('Company with this email already exists');
      }

      // Step 4: Hash user's password
      const hashedPassword = await bcrypt.hash(createDto.password_user, 12);

      // Step 5: Generate company's client_id and client_key
      const clientId = this.generateClientId();
      const clientKey = this.generateClientKey();
      const hashedClientKey = await bcrypt.hash(clientKey, 12);

      // Use database transaction for atomicity
      const result = await this.prisma.$transaction(async (prisma) => {
        // Step 6: Create company record
        const company = await prisma.company.create({
          data: {
            name: createDto.name_company,
            country: createDto.country_company,
            email: createDto.email_company,
            clientId,
            clientKey: hashedClientKey,
          },
        });

        // Step 7: Create user record associated with company
        const user = await prisma.user.create({
          data: {
            fullName: createDto.full_name_user,
            email: createDto.email_user,
            password: hashedPassword,
            companyId: company.id,
          },
        });

        // Step 8: Assign 'owner' role to user for this company
        // Ensure 'owner' role exists
        let ownerRole = await prisma.role.findUnique({
          where: { name: 'owner' },
        });

        if (!ownerRole) {
          ownerRole = await prisma.role.create({
            data: { name: 'owner' },
          });
        }

        // Create user-company-role association
        await prisma.userCompanyRole.create({
          data: {
            userId: user.id,
            companyId: company.id,
            roleId: ownerRole.id,
          },
        });

        // Step 9: Create default wallets for the company
        const wallets = await Promise.all([
          prisma.wallet.create({
            data: {
              balance: 0,
              active: true,
              currency: 'XAF',
              country: 'Cameroon',
              countryIsoCode: 'CM',
              companyId: company.id,
            },
          }),
          prisma.wallet.create({
            data: {
              balance: 2000,
              active: true,
              currency: 'USD',
              country: 'USA',
              countryIsoCode: 'USA',
              companyId: company.id,
            },
          }),
        ]);

        return { company, user, wallets };
      });

      // Step 10: Return success response
      return {
        status: true,
        message: 'Company and owner user created successfully. Proceed to next step.',
        user: this.mapUserToResponseDto(result.user),
        company: this.mapCompanyToResponseDto(result.company, clientKey), // Include raw client_key in response
        wallets: result.wallets.map(wallet => this.mapWalletToResponseDto(wallet)),
      };

    } catch (error) {
      // Handle known validation errors
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      // Handle any unexpected errors
      throw new BadRequestException({
        success: false,
        message: 'Une erreur est survenue lors de l\'enregistrement',
        error: error.message,
      });
    }
  }

  async getCompanyBalance(companyId: string): Promise<{ wallets: WalletResponseDto[] }> {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        companyId,
        active: true,
      },
    });

    return {
      wallets: wallets.map(wallet => this.mapWalletToResponseDto(wallet)),
    };
  }

  private generateClientId(): string {
    const prefix = 'client_';
    const randomPart = Math.random().toString(36).substring(2, 15);
    return prefix + randomPart;
  }

  private generateClientKey(): string {
    const length = 32;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return result;
  }

  private mapCompanyToResponseDto(company: any, clientKey?: string): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      country: company.country,
      email: company.email,
      client_id: company.clientId,
      client_key: clientKey || '***hidden***', // Only show raw key during creation
      card_price: parseFloat(company.cardPrice?.toString() || '5.00'),
      card_fund_rate: parseFloat(company.cardFundRate?.toString() || '1.02'),
      created_at: company.createdAt,
      updated_at: company.updatedAt,
    };
  }

  private mapUserToResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      company_id: user.companyId,
      step: user.step,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  private mapWalletToResponseDto(wallet: any): WalletResponseDto {
    return {
      id: wallet.id,
      balance: parseFloat(wallet.balance.toString()),
      active: wallet.active,
      currency: wallet.currency,
      country: wallet.country,
      country_iso_code: wallet.countryIsoCode,
      company_id: wallet.companyId,
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    };
  }
}
