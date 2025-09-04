// src/models/prisma/companyModel.ts
import { FilterObject } from "@/types";
import {
  sanitizeName,
  sanitizeTextInput,
  setMethodFilter,
} from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface CompanyModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputCompany: Prisma.CompanyUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, companyData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class CompanyModel {
  static async getOne(filters: FilterObject) {
    try {
      const result = await prisma.company.findFirst(
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
      const result = await prisma.company.findMany(
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
      if (inputCompany.email) {
        companyData.email = sanitizeTextInput(inputCompany.email);
      }
      const company = await prisma.company.create({ data: companyData });
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
      const updatedCompany = await prisma.company.update({
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
      const deletedCompany = await prisma.company.delete({ where });
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
      const prisma = require("@/modules/prisma/prisma.service").prisma;
      return await prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default CompanyModel;
