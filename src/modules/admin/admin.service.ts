import { CompanyModel, UserModel } from "@/models";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { KybDto, KycDto } from "./dto/admin.dto";
import { EmailService } from "../../services/email.service";
import { KycStatus } from "@prisma/client";

@Injectable()
export class AdminService {
  constructor(private emailService: EmailService) {}

  async getAllCompanies(status?: "pending" | "approved" | "none") {
    const result = await CompanyModel.getWithOwner({}, status);
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
      // await this.emailService.approveKycEmail(userEmail, userName);
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
      // await this.emailService.approveKycEmail(companyEmail, comapnyName);
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
}
