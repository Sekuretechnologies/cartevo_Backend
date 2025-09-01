import WalletPhoneNumberModel from "@/models/prisma/walletPhoneNumberModel";
import fnOutput from "@/utils/shared/fnOutputHandler";

export interface IWalletPhoneNumberData {
  wallet_id: string;
  country_iso_code: string;
  country_phone_code: string;
  currency: string;
  phone_number: string;
  operator: string;
}

class WalletPhoneNumberService {
  async create(data: IWalletPhoneNumberData) {
    try {
      const result = await WalletPhoneNumberModel.create(data);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to create wallet phone number: " + error.message,
        },
      });
    }
  }

  async getAll(walletId?: string) {
    try {
      const filters = walletId ? { wallet_id: walletId } : {};
      const result = await WalletPhoneNumberModel.get(filters);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to get wallet phone numbers: " + error.message,
        },
      });
    }
  }

  async getOne(id: string) {
    try {
      const result = await WalletPhoneNumberModel.getOne({ id });
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to get wallet phone number: " + error.message,
        },
      });
    }
  }

  async update(id: string, data: Partial<IWalletPhoneNumberData>) {
    try {
      const result = await WalletPhoneNumberModel.update(id, data);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to update wallet phone number: " + error.message,
        },
      });
    }
  }

  async delete(id: string) {
    try {
      const result = await WalletPhoneNumberModel.delete(id);
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: {
          message: "Failed to delete wallet phone number: " + error.message,
        },
      });
    }
  }
}

export default new WalletPhoneNumberService();
