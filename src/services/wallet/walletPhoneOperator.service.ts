import WalletPhoneOperatorModel from "@/models/prisma/walletPhoneOperatorModel";
import fnOutput from "@/utils/shared/fnOutputHandler";

export interface IWalletPhoneOperatorData {
  country_iso_code: string;
  country_phone_code: string;
  currency: string;
  operator_code: string;
  operator_name: string;
  otp_required: boolean;
  ussd_code?: string;
}

class WalletPhoneOperatorService {
  async create(data: IWalletPhoneOperatorData) {
    try {
      const result = await WalletPhoneOperatorModel.create(data);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to create wallet phone operator: " + error.message,
        },
      });
    }
  }

  async getAll(countryIsoCode?: string, currency?: string) {
    try {
      const filters: any = {};
      if (countryIsoCode) filters.country_iso_code = countryIsoCode;
      if (currency) filters.currency = currency;

      const result = await WalletPhoneOperatorModel.get(filters);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to get wallet phone operators: " + error.message,
        },
      });
    }
  }

  async getOne(id: string) {
    try {
      const result = await WalletPhoneOperatorModel.getOne({ id });
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to get wallet phone operator: " + error.message,
        },
      });
    }
  }

  async update(id: string, data: Partial<IWalletPhoneOperatorData>) {
    try {
      const result = await WalletPhoneOperatorModel.update(id, data);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to update wallet phone operator: " + error.message,
        },
      });
    }
  }

  async delete(id: string) {
    try {
      const result = await WalletPhoneOperatorModel.delete(id);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to delete wallet phone operator: " + error.message,
        },
      });
    }
  }

  async getByCountryAndCurrency(countryIsoCode: string, currency: string) {
    try {
      const result = await WalletPhoneOperatorModel.get({
        country_iso_code: countryIsoCode,
        currency: currency,
      });
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message:
            "Failed to get operators by country and currency: " + error.message,
        },
      });
    }
  }
}

export default new WalletPhoneOperatorService();
