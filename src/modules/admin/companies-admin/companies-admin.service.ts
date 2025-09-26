import {
  CardModel,
  CompanyModel,
  CustomerModel,
  TransactionModel,
  UserModel,
} from "@/models";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class CompaniesAdminService {
  async getUserByCompany(company_id: string) {
    const company = await CompanyModel.getOne({ id: company_id });
    if (company.error) {
      throw new NotFoundException("Company not found");
    }

    const users = await CompanyModel.getUsersByCompany(company_id);

    if (users.error) {
      throw new Error(users.message);
    }

    return {
      success: true,
      message: "users retrieved successfully",
      users: users.output,
    };
  }

  async getTransactionsByCompany(company_id: string) {
    const company = await CompanyModel.getOne({ id: company_id });

    if (company.error) {
      throw new NotFoundException("Company not found");
    }

    const transactions = await TransactionModel.getTransactionsByCompany(
      company_id
    );

    if (transactions.error) {
      throw new Error(transactions.message);
    }

    return {
      success: true,
      message: "Transactions retrieved successfully",
      transactions: transactions.output,
    };
  }

  async getCustomersByCompany(company_id: string) {
    const company = await CompanyModel.getOne({ id: company_id });

    if (company.error) {
      throw new NotFoundException("Company not found");
    }

    const customers = await CustomerModel.getCustomersByCompany(company_id);

    if (customers.error) {
      throw new Error(customers.message);
    }

    return {
      success: true,
      message: "customers retrieved successfully",
      users: customers.output,
    };
  }

  async getCardsByCompany(company_id: string) {
    const company = await CompanyModel.getOne({ id: company_id });
    if (company.error) {
      throw new NotFoundException("Company not found");
    }

    const cards = await CardModel.getCardsByCompany(company_id);
    if (cards.error) {
      throw new Error(cards.message);
    }

    return {
      success: true,
      message: "cards retrieved successfully",
      cards: cards.output,
    };
  }
}
