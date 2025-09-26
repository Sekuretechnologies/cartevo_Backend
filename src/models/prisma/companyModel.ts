import { FilterObject } from "@/types";
import {
  sanitizeName,
  sanitizeTextInput,
  setMethodFilter,
} from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { KybStatus, KycStatus, Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

export interface CompanyModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputCompany: Prisma.CompanyUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, companyData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class CompanyModel {
  static get prisma() {
    return new PrismaClient();
  }

  static async getOne(filters: FilterObject) {
    try {
      const result = await this.prisma.company.findFirst(
        buildPrismaQuery({ filters })
      );
      if (!result) {
        return fnOutput.error({
          message: "Company not found",
          error: { message: "Company not found" },
        });
      }
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching company: " + error.message,
        error: { message: "Error fetching company: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await this.prisma.company.findMany(
        buildPrismaQuery({ filters })
      );
      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching companies: " + error.message,
        error: { message: "Error fetching companies: " + error.message },
      });
    }
  }

  static async create(inputCompany: Prisma.CompanyUncheckedCreateInput) {
    try {
      const companyData = { ...inputCompany };
      if (inputCompany.name) {
        companyData.name = sanitizeName(inputCompany.name);
      }
      if (inputCompany.country) {
        companyData.country = sanitizeTextInput(inputCompany.country);
      }
      const company = await this.prisma.company.create({ data: companyData });
      0;
      return fnOutput.success({ code: 201, output: company });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating company: " + error.message,
        error: { message: "Error creating company: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, companyData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CompanyWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedCompanyData: Prisma.CompanyUncheckedUpdateInput = {
        ...companyData,
      };
      if (companyData.name) {
        updatedCompanyData.name = sanitizeName(companyData.name);
      }
      if (companyData.country) {
        updatedCompanyData.country = sanitizeTextInput(companyData.country);
      }
      if (companyData.email) {
        updatedCompanyData.email = sanitizeTextInput(companyData.email);
      }
      const updatedCompany = await this.prisma.company.update({
        where,
        data: updatedCompanyData,
      });
      return fnOutput.success({ code: 204, output: updatedCompany });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating company: " + error.message,
        error: { message: "Error updating company: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CompanyWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedCompany = await this.prisma.company.delete({ where });
      return fnOutput.success({ output: deletedCompany });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting company: " + error.message,
        error: { message: "Error deleting company: " + error.message },
      });
    }
  }

  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }

  /**
   *
   *  Recuperer les companies avec les owners
   *
   */
  static async getWithOwner(
    filters: any = {},
    statusFilter?: "pending" | "approved" | "rejected" | "none"
  ) {
    try {
      const companies = await this.prisma.company.findMany({
        where: filters,
        include: {
          userCompanyRoles: {
            where: { role: { name: "owner" } },
            include: {
              role: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  address: true,
                  email: true,
                  phone_number: true,
                  nationality: true,
                  id_document_type: true,
                  id_number: true,
                  id_document_front: true,
                  id_document_back: true,
                  proof_of_address: true,
                  country_of_residence: true,
                  state: true,
                  city: true,
                  street: true,
                  postal_code: true,
                  kyc_status: true,
                },
              },
            },
          },
        },
      });

      const formatted = companies
        .map((c) => {
          const { userCompanyRoles, ...rest } = c;
          const owner = userCompanyRoles[0]?.user;

          const kycStatus = owner?.kyc_status as KycStatus | undefined;
          const kybStatus = c.kyb_status as KybStatus | undefined;

          let status: "pending" | "approved" | "rejected" | "none";

          if (
            kycStatus === KycStatus.REJECTED &&
            kybStatus === KybStatus.REJECTED
          ) {
            status = "rejected";
          } else if (
            kycStatus === KycStatus.APPROVED &&
            kybStatus === KybStatus.APPROVED
          ) {
            status = "approved";
          } else if (
            kycStatus === KycStatus.NONE &&
            kybStatus === KybStatus.NONE
          ) {
            status = "none";
          } else if (
            (kycStatus === KycStatus.REJECTED &&
              kybStatus === KybStatus.NONE) ||
            (kycStatus === KycStatus.NONE && kybStatus === KybStatus.REJECTED)
          ) {
            status = "rejected";
          } else {
            status = "pending";
          }

          return {
            ...rest,
            owner,
            status,
          };
        })
        .filter((c) => (statusFilter ? c.status === statusFilter : true));

      return fnOutput.success({ output: formatted });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching companies with owner",
        error,
      });
    }
  }

  /**
   * Annuler KYB
   */
  static async rejectkyb(companyId: string) {
    try {
      const company = await this.prisma.company.update({
        where: { id: companyId },
        data: { kyb_status: "REJECTED" },
      });
      return fnOutput.success({ output: company });
    } catch (error: any) {
      return fnOutput.error({ message: error.message, error });
    }
  }

  static async getUsersByCompany(companyId: string) {
    try {
      // On récupère tous les userCompanyRoles actifs pour cette company
      const userCompanyRoles = await this.prisma.userCompanyRole.findMany({
        where: {
          company_id: companyId,
          is_active: true,
        },
        include: {
          user: true, // récupère toutes les infos user
          role: true, // récupère aussi le rôle
        },
      });

      // juste la liste des users
      const users = userCompanyRoles.map((ucr) => ({
        ...ucr.user,
        role: ucr.role,
      }));

      return fnOutput.success({ output: users });
    } catch (error: any) {
      return fnOutput.error({ message: error.message, error });
    }
  }
}

export default CompanyModel;
