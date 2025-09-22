// src/models/UserModel.ts
import { FilterObject, IncludeObject } from "@/types";
import {
  sanitizeName,
  sanitizeTextInput,
  setMethodFilter,
} from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface UserModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(
    inputUser: Prisma.UserUncheckedCreateInput,
    hashedPassword?: any
  ): Promise<any>;
  update(identifier: string | any, userData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}
class UserModel {
  static async getOne(filters: FilterObject, include: IncludeObject = {}) {
    try {
      const result = await prisma.user.findFirst(
        buildPrismaQuery({ filters, include })
      );
      if (!result) {
        return fnOutput.error({
          message: "User not found",
          error: { message: "User not found" },
        });
      }
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching user: " + error.message,
        error: { message: "Error fetching user: " + error.message },
      });
    }
  }

  static async getWithRolesAndCompany(filters: {
    roleId?: string;
    companyId?: string;
  }) {
    try {
      const { roleId, companyId } = filters;

      const where: any = {};
      if (companyId || roleId) {
        where.userCompanyRoles = {
          some: {},
        };
        if (companyId) {
          where.userCompanyRoles.some.companyId = companyId;
        }
        if (roleId) {
          where.userCompanyRoles.some.roleId = roleId;
        }
      }

      const result = await prisma.user.findMany({
        where,
        include: {
          userCompanyRoles: {
            include: { role: true, company: true },
          },
        },
      });

      return fnOutput.success({ output: result });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching users by role/company: " + error.message,
        error: {
          message: "Error fetching users by role/company: " + error.message,
        },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.user.findMany(buildPrismaQuery({ filters }));
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching users: " + error.message,
        error: { message: "Error fetching users: " + error.message },
      });
    }
  }

  static async create(
    inputUser: Prisma.UserUncheckedCreateInput,
    hashedPassword?: any
  ) {
    try {
      const userData = { ...inputUser };

      // Only hash password if it's provided and no hashedPassword is given
      if (!hashedPassword && inputUser.password) {
        userData.password = await bcrypt.hash(inputUser.password, 12);
      } else if (hashedPassword) {
        userData.password = hashedPassword;
      }
      // If neither password nor hashedPassword is provided, leave password undefined
      if (inputUser.address) {
        userData.address = sanitizeTextInput(inputUser.address);
      }

      if (inputUser.first_name) {
        userData.first_name = sanitizeName(inputUser.first_name);
      }
      if (inputUser.last_name) {
        userData.last_name = sanitizeName(inputUser.last_name);
      }

      const user = await prisma.user.create({
        data: userData,
      });

      return fnOutput.success({
        code: 201,
        output: user,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating user: " + error.message,
        error: { message: "Error creating user: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, userData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.UserWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }

      const updatedUserData: Prisma.UserUncheckedUpdateInput = { ...userData };
      if (userData.password) {
        let password = await bcrypt.hash(userData.password, 12);
        updatedUserData.password = password;
      }
      if (userData.address) {
        updatedUserData.address = sanitizeTextInput(userData.address);
      }
      if (userData.first_name) {
        userData.first_name = sanitizeName(userData.first_name);
      }
      if (userData.last_name) {
        userData.last_name = sanitizeName(userData.last_name);
      }

      const updatedUser = await prisma.user.update({
        where,
        data: updatedUserData,
      });

      return fnOutput.success({
        code: 204,
        output: updatedUser,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating user: " + error.message,
        error: { message: "Error updating user: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.UserWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedUser = await prisma.user.delete({
        where,
      });

      return fnOutput.success({
        output: deletedUser,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting user: " + error.message,
        error: { message: "Error deleting user: " + error.message },
      });
    }
  }

  static async getByCompany(params: {
    companyId?: string;
    skip?: number;
    take?: number;
  }) {
    const { companyId, skip = 0, take = 10 } = params;

    const where: any = {};
    if (companyId) {
      where.userCompanyRoles = {
        some: {
          company_id: companyId,
          is_active: true,
        },
      };
    }

    const [output, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      output,
      pagination: {
        total,
        page: skip / take + 1,
        numberPerPage: take,
        totalPages,
      },
    };
  }
  /**
   * This method allows for transactional operations.
   * It accepts a callback function that receives the Prisma client instance.
   * The transaction ensures that if any step fails, all changes are rolled back.
   *
   * @param callback The callback function to execute within the transaction.
   * @returns The result of the callback function.
   */
  static async operation<T>(callback: (prisma: any) => Promise<T>): Promise<T> {
    try {
      // Use the global prisma instance
      const prisma = require("@/modules/prisma/prisma.service").prisma;
      return await prisma.$transaction(callback);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }

  // // Valider le kyc
  // static async approveKyc(userId: string) {
  //   try {
  //     const user = await prisma.user.update({
  //       where: { id: userId },
  //       data: { kyc_status: "APPROVED" },
  //     });

  //     return fnOutput.success({ output: user });
  //   } catch (error: any) {
  //     return fnOutput.error({ message: error.message, error });
  //   }
  // }

  // /**
  //  * Annuler le kyc
  //  */

  // static async rejectKyc(userId: string) {
  //   try {
  //     const user = await prisma.user.update({
  //       where: { id: userId },
  //       data: { kyc_status: "REJECTED" },
  //     });

  //     return fnOutput.success({ output: user });
  //   } catch (error: any) {
  //     return fnOutput.error({ message: error.message, error });
  //   }
  // }
}

export default UserModel;
