// src/models/prisma/cardModel.ts
import { FilterObject, IncludeObject } from "@/types";
import { setMethodFilter } from "@/utils/shared/common";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildPrismaQuery } from "prisma/functions";

const prisma = new PrismaClient();

export interface CardModelInterface {
  getOne(filters: FilterObject): Promise<any>;
  get(filters?: FilterObject): Promise<any>;
  create(inputCard: Prisma.CardUncheckedCreateInput): Promise<any>;
  update(identifier: string | any, cardData: any): Promise<any>;
  delete(identifier: string | any): Promise<any>;
}

class CardModel {
  static async getOne(filters: FilterObject, include: IncludeObject = {}) {
    try {
      const result = await prisma.card.findFirst(
        buildPrismaQuery({ filters, include })
      );
      if (!result) {
        return fnOutput.error({
          message: "Card not found",
          error: { message: "Card not found" },
        });
      }
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching card: " + error.message,
        error: { message: "Error fetching card: " + error.message },
      });
    }
  }

  static async get(filters?: FilterObject) {
    try {
      const result = await prisma.card.findMany(buildPrismaQuery({ filters }));
      return fnOutput.success({
        output: result,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching cards: " + error.message,
        error: { message: "Error fetching cards: " + error.message },
      });
    }
  }

  static async create(inputCard: Prisma.CardUncheckedCreateInput) {
    try {
      const cardData = { ...inputCard };
      const card = await prisma.card.create({
        data: cardData,
      });
      return fnOutput.success({
        code: 201,
        output: card,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error creating card: " + error.message,
        error: { message: "Error creating card: " + error.message },
      });
    }
  }

  static async update(identifier: string | any, cardData: any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CardWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const updatedCardData: Prisma.CardUncheckedUpdateInput = { ...cardData };
      const updatedCard = await prisma.card.update({
        where,
        data: updatedCardData,
      });
      return fnOutput.success({
        code: 204,
        output: updatedCard,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error updating card: " + error.message,
        error: { message: "Error updating card: " + error.message },
      });
    }
  }

  static async delete(identifier: string | any) {
    try {
      const { key, value } = setMethodFilter(identifier);
      const where = { [key]: value } as Prisma.CardWhereUniqueInput;
      if (!where[key]) {
        return fnOutput.error({
          message: "Invalid identifier provided",
          error: { message: "Invalid identifier provided" },
        });
      }
      const deletedCard = await prisma.card.delete({
        where,
      });
      return fnOutput.success({
        output: deletedCard,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error deleting card: " + error.message,
        error: { message: "Error deleting card: " + error.message },
      });
    }
  }

  static async count(filters: FilterObject) {
    try {
      const count = await prisma.card.count({ where: filters });
      return fnOutput.success({
        output: count,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error counting cards: " + error.message,
        error: { message: "Error counting cards: " + error.message },
      });
    }
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

  static async getCardsByCompany(
    companyId: string,
    filters?: { status?: string; brand?: string }
  ) {
    try {
      const whereClause: any = {};

      // Appliquer le filtre status si présent
      if (filters?.status) {
        whereClause.status = filters.status;
      }

      // Appliquer le filtre brand si présent
      if (filters?.brand) {
        whereClause.brand = filters.brand;
      }

      const companyWithCards = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          cards: {
            where: whereClause,
          },
        },
      });

      return fnOutput.success({ output: companyWithCards.cards });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching cards: " + error.message,
        error,
      });
    }
  }

  static async getCards(
    filters?: {
      status?: string;
      brand?: string;
      created_at?: { gte?: string; lte?: string };
    },
    order?: {
      [key: string]: "asc" | "desc";
    }
  ) {
    try {
      const query: any = {};

      // --- Filtres ---
      if (filters) {
        query.where = {};

        if (filters.status) {
          query.where.status = filters.status;
        }

        if (filters.brand) {
          query.where.brand = filters.brand;
        }

        if (filters.created_at) {
          query.where.created_at = {};
          if (filters.created_at.gte) {
            query.where.created_at.gte = new Date(filters.created_at.gte);
          }
          if (filters.created_at.lte) {
            query.where.created_at.lte = new Date(filters.created_at.lte);
          }
        }
      }

      if (order) {
        query.orderBy = Object.entries(order).map(([field, direction]) => ({
          [field]: direction,
        }));
      }

      const result = await prisma.card.findMany(query);

      const sanitized = result.map(({ number, cvv, ...rest }) => rest);

      return fnOutput.success({
        output: sanitized,
      });
    } catch (error: any) {
      return fnOutput.error({
        message: "Error fetching cards: " + error.message,
        error: { message: error.message },
      });
    }
  }
}

export default CardModel;
