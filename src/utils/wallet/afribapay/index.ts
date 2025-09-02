import env from "@/env";
import axios from "axios";
import { tokenCache } from "@/utils/cache/nodeCache";
import fnOutput from "@/utils/shared/fnOutputHandler";

/** ========================================================== */
const getOrGenerateAfribapayToken = async (): Promise<string> => {
  let token = await tokenCache.getAfribapayToken("afribapayToken");
  if (!token) {
    const response = await generateAfribapayToken();
    token = (response.data as any).access_token || (response.data as any).token;
    if (!token) {
      throw new Error(
        "Failed to obtain access token from Afribapay API. Response: " +
          JSON.stringify(response.data)
      );
    }
  }
  return token;
};

/** ========================================================== */
export const generateAfribapayToken = async () => {
  const method = "POST";
  const url = `${env.AFRIBAPAY_API_COLLECT_URL}/token`;
  console.log(
    "generateAfribapayToken ########################################"
  );
  console.log(
    "env.AFRIBAPAY_API_COLLECT_URL :: ",
    env.AFRIBAPAY_API_COLLECT_URL
  );
  console.log("env.AFRIBAPAY_API_USER :: ", env.AFRIBAPAY_API_USER);
  console.log("env.AFRIBAPAY_API_KEY :: ", env.AFRIBAPAY_API_KEY);

  const config = {
    method,
    url,
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Basic base64(${env.AFRIBAPAY_API_USER}:${env.AFRIBAPAY_API_KEY})`,
      Authorization: `Basic ${Buffer.from(
        `${env.AFRIBAPAY_API_USER}:${env.AFRIBAPAY_API_KEY}`
      ).toString("base64")}`,
    },
    data: {},
  };

  console.log("generateAfribapayToken config :: ", config);

  try {
    const response = await axios(config);

    console.log("generateAfribapayToken response :: ", response.data);

    // Cache the token for 1 hour (3600 seconds)
    let token =
      (response.data as any).access_token || (response.data as any).token;
    if (response.data && token) {
      await tokenCache.setAfribapayToken("afribapayToken", token, 3600);
    }

    console.log("########################################");

    return response;
  } catch (error: any) {
    console.log("generateAfribapayToken error:");
    console.log("------------------------------------------");
    console.log("error.message :: ", error.message);
    console.log("------------------------------------------");
    console.log("error?.response?.data :: ", error?.response?.data);
    console.log("------------------------------------------");
    throw error;
  }
};

/** ========================================================== */
export const checkAfribapayTransactionStatus = async (
  transactionId: string
) => {
  try {
    const token = await getOrGenerateAfribapayToken();

    console.log("checkAfribapayTransactionStatus token :: ", token);

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `${env.AFRIBAPAY_API_COLLECT_URL}/status?transaction_id=${transactionId}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    console.log(
      "checkAfribapayTransactionStatus transactionId ::",
      transactionId
    );
    console.log("checkAfribapayTransactionStatus config ::", config);

    const response = await axios(config);

    return fnOutput.success({
      output: response.data,
    });
  } catch (error: any) {
    console.log(`checkAfribapayTransactionStatus error:`);
    console.log("------------------------------------------");
    console.log("error.message :: ", error.message);
    console.log("------------------------------------------");
    console.log("error?.response?.data :: ", error?.response?.data);
    console.log("------------------------------------------");
    console.log("error :: ", error);
    console.log("------------------------------------------");
    // console.log(error);
    return fnOutput.error({
      error: {
        message: `checkAfribapayTransactionStatus error: ${error.message}`,
      },
    });
  }
};

/** ========================================================== */
interface IAfribapayDeposit {
  amount: number | string;
  country?: string;
  currency?: string;
  phone: string;
  orderId: string;
  operator: string; // orange | mtn
  countryPhoneCode: string;
}
export const initiateAfribapayCollect = async ({
  amount,
  country = "CM",
  currency = "XAF",
  phone,
  orderId,
  operator = "mtn",
  countryPhoneCode = "237",
}: IAfribapayDeposit) => {
  try {
    const token = await getOrGenerateAfribapayToken();

    console.log("initiateAfribapayCollect token :: ", token);

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${env.AFRIBAPAY_API_COLLECT_URL}/pay/payin`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      data: {
        operator,
        country,
        phone_number: `${countryPhoneCode}${phone}`,
        amount,
        currency,
        order_id: orderId,
        merchant_key: env.AFRIBAPAY_API_MERCHANT,
        notify_url: "https://cartevo.co/api/v1/webhook/afribapay",
        // reference_id: 'ref-Banana-House',
        // lang: 'fr',
        // return_url: 'https://example.com/success',
        // cancel_url: 'https://example.com/cancel',
      },
    };

    console.log("initiateAfribapayCollect config :: ", config);

    const response = await axios(config);

    return response;
  } catch (error: any) {
    console.log("initiateAfribapayCollect error:");
    console.log("------------------------------------------");
    console.log("error.message :: ", error.message);
    console.log("------------------------------------------");
    console.log("error?.response?.data :: ", error?.response?.data);
    console.log("------------------------------------------");
    throw error;
  }
};

/** ========================================================== */
interface IAfribapayPayout {
  amount: number | string;
  country?: string;
  currency?: string;
  phone: string;
  orderId: string;
  operator: string; // orange | mtn
  countryPhoneCode: string;
}
export const initiateAfribapayPayout = async ({
  amount,
  country = "CM",
  currency = "XAF",
  phone,
  orderId,
  operator = "mtn",
  countryPhoneCode = "237",
}: IAfribapayPayout) => {
  const token = await getOrGenerateAfribapayToken();

  console.log("initiateAfribapayPayout token :: ", token);

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${env.AFRIBAPAY_API_PAYOUT_URL}/pay/payout`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    data: {
      operator,
      country,
      phone_number: `${countryPhoneCode}${phone}`,
      amount,
      currency,
      order_id: orderId,
      merchant_key: env.AFRIBAPAY_API_MERCHANT,
      notify_url:
        "https://apigetsekure.com/api/v2/webhook/transactions/wallet/update-afribapay-transaction-status",
      // reference_id: 'ref-Banana-House',
      // lang: 'fr',
      // return_url: 'https://example.com/success',
      // cancel_url: 'https://example.com/cancel',
    },
  };

  console.log("initiateAfribapayPayout config :: ", config);

  const response = await axios(config);

  return response;
};

/** ========================================================== */
export const checkAfribapayBalance = async () => {
  const token = await getOrGenerateAfribapayToken();

  console.log("checkAfribapayBalance token :: ", token);

  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${env.AFRIBAPAY_API_COLLECT_URL}/balance`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  console.log("checkAfribapayBalance config :: ", config);

  const response = await axios(config);

  return response;
};

const afribapayUtils = {
  generateAfribapayToken,
  initiateAfribapayCollect,
  initiateAfribapayPayout,
  checkAfribapayTransactionStatus,
  checkAfribapayBalance,
};

export default afribapayUtils;
