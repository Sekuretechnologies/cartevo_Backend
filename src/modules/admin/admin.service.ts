import { CompanyModel, UserModel } from "@/models";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { KybDto, KycDto, ToggleUserStatusDto } from "./dto/admin.dto";
import { EmailService } from "../../services/email.service";
import { KycStatus } from "@prisma/client";
import { da, id } from "date-fns/locale";
import fnOutput from "@/utils/shared/fnOutputHandler";

@Injectable()
export class AdminService {
  constructor(private emailService: EmailService) {}

  // admin.service.ts
  async getAllCompanies(
    filters: {
      country?: string;
      business_type?: string;
      is_active?: boolean;
    } = {},
    status?: "pending" | "approved" | "none"
  ) {
    // Passe les filtres directement à CompanyModel
    const result = await CompanyModel.getWithOwner(filters, status);

    if (result.error) {
      throw new NotFoundException(result.error.message);
    }

    return { data: result.output };
  }

  async handleKyc(kycDto: KycDto) {
    const user = await UserModel.getOne({ id: kycDto.userId });

    if (user.error) {
      throw new NotFoundException("user not found, cannot process  KYC");
    }

    const userEmail = user.output.email;
    const userName = user.output.first_name + " " + user.output.last_name;
    const kyc_status = user.output.kyc_status;

    if (kyc_status === kycDto.value) {
      throw new BadRequestException(
        `The KYC status is already set to "${kycDto.value}", no changes were made.`
      );
    }

    if (kycDto.value === "REJECTED") {
      if (!kycDto.message) {
        throw new BadRequestException("To reject a KYC, a message is required");
      }

      await this.emailService.rejectKycEmail(
        userEmail,
        userName,
        kycDto.message
      );
    } else {
      await this.emailService.approveKycEmail(userEmail, userName);
    }

    const result = await UserModel.update(kycDto.userId, {
      kyc_status: kycDto.value,
    });

    return {
      success: true,
      message: `KYC ${kycDto.value.toLowerCase()} successfully`,
      user: result.output.kyc_status,
    };
  }

  async handleKyb(kybDto: KybDto) {
    const company = await CompanyModel.getOne({ id: kybDto.companyId });

    if (company.error) {
      throw new NotFoundException("Company not found, cannot process kyb");
    }

    const companyEmail = company.output.email;
    const comapnyName = company.output.name;
    const kyb_status = company.output.kyb_status;

    if (kyb_status === kybDto.value) {
      throw new BadRequestException(
        `The KYC status is already set to "${kybDto.value}", no changes were made.`
      );
    }

    if (kybDto.value === "REJECTED") {
      if (!kybDto.message) {
        throw new BadRequestException("To reject a KYC, a message is required");
      }

      await this.emailService.rejectKycEmail(
        companyEmail,
        comapnyName,
        kybDto.message
      );
    } else {
      await this.emailService.approveKycEmail(companyEmail, comapnyName);
    }

    const result = await CompanyModel.update(kybDto.companyId, {
      kyb_status: kybDto.value,
    });

    return {
      success: true,
      message: `KYC ${kybDto.value.toLowerCase()} successfully`,
      user: result.output.kbc_status,
    };
  }

  /**
   *
   * update company
   */
  async updateCompany(id: string, data: any) {
    const companyResult = await CompanyModel.get({ id });

    if (companyResult.error) {
      throw new NotFoundException("Company not found");
    }

    const updatedCompany = await CompanyModel.update(id, data);

    return updatedCompany;
  }

  /**
   * Desactiver une companie
   */
  async toggleCompanySTatus(id: string, isActive: boolean) {
    const companyResult = await CompanyModel.get({ id });

    if (companyResult.error) {
      throw new NotFoundException("Company not found");
    }

    const company = await CompanyModel.update(id, {
      is_active: isActive,
    });

    return {
      message: `Company ${isActive ? "activated" : "deactivated"} successfully`,
      data: company,
    };
  }

  /*********************************************************************************/
  async getUsers(filters?: { companyId?: string }, page = 1, perPage = 100) {
    const skip = (page - 1) * perPage;

    try {
      const result = await UserModel.getByCompany({
        ...filters,
        skip,
        take: perPage,
      });

      const users = result?.output ?? [];

      if (users.length === 0) {
        return fnOutput.success({
          message: "No users found",
        });
      }

      return {
        message: "Users retrieved successfully",
        data: users,
        pagination: result.pagination,
      };
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching users: " + error.message,
        error: { message: error.message },
      });
    }
  }

  async toggleUserStatus(userId: string, status: ToggleUserStatusDto) {
    const userResult = await UserModel.getOne({ id: userId });

    if (userResult.error) {
      throw new NotFoundException("user not found");
    }
    const updatedUser = await UserModel.update(userId, { status: status });

    return {
      message: `user ${status ? "activated" : "deactivated"} successfully`,
      data: updatedUser,
    };
  }
}
