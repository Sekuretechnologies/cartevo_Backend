interface ISudoConfig {
    method: string;
    url: string;
    data?: any;
}
interface ILogError {
    error: any;
    requestData: any;
    requestHeaders: any;
    requestUrl: any;
    requestMethod: any;
}
interface ISudoBillingAddress {
    country: string;
    state: string;
    city: string;
    line1: string;
    postalCode?: string;
}
interface ISudoCustomerIdentity {
    type: "BVN" | "NIN" | "CAC" | "TIN";
    number: string;
}
interface ISudoCustomerDocuments {
    idFrontUrl?: string;
    idBackUrl?: string;
}
interface ISudoCustomerIndividual {
    firstName: string;
    lastName: string;
    date_of_birth: string;
    otherNames?: string;
    identity?: ISudoCustomerIdentity;
    documents?: ISudoCustomerDocuments;
}
interface ISudoCustomerData {
    type: "individual" | "company";
    name: string;
    phoneNumber: string;
    status: "active" | "inactive";
    billingAddress: ISudoBillingAddress;
    emailAddress?: string;
    individual?: ISudoCustomerIndividual;
}
interface ISudoFundingSourceData {
    type: "default" | "account" | "gateway";
    status: "active" | "inactive";
}
export declare const logError: ({ error, requestData, requestHeaders, requestUrl, requestMethod, }: ILogError) => void;
declare function getLastSyncDate(id: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
declare const sudoUtils: {
    createSudoRequest: ({ method, url, data }: ISudoConfig) => {
        data: any;
        method: string;
        url: string;
        headers: {
            "Content-Type": string;
            Authorization: string;
        };
        httpsAgent: any;
        timeout: number;
    };
    makeSudoRequest: ({ method, url, data }: ISudoConfig) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    createCustomer: (customerData: ISudoCustomerData) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCustomer: (customerId: string) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCustomers: (page?: number, limit?: number) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    updateCustomer: (customerId: string, customerData: ISudoCustomerData) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    hasCustomer: (user: any) => boolean;
    getDollarRate: (countryCode: string) => number;
    convertToUsd: (amount: number, countryCode: string) => number;
    convertFromUsd: (usdAmount: number, countryCode: string) => number;
    mapIdTypeToSudoIdentity: (idType: string, country: string) => "BVN" | "NIN" | "CAC" | "TIN";
    formatDateForSudo: (date: Date | string | undefined) => string;
    prepareCustomerData: (user: any) => ISudoCustomerData;
    logError: ({ error, requestData, requestHeaders, requestUrl, requestMethod, }: ILogError) => void;
    createFundingSource: (fundingSourceData: ISudoFundingSourceData) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getFundingSource: (fundingSourceId: string) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getFundingSources: () => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    updateFundingSource: (fundingSourceId: string, fundingSourceData: ISudoFundingSourceData) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getActiveFundingSource: () => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    chooseCardBrand: () => "Visa" | "MasterCard";
    getDebitAccountId: () => string;
    createCard: (customerId: string, brand: "Visa" | "MasterCard", amount?: number) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCard: (cardId: string, reveal?: boolean) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCardTransactions: ({ cardId, page, limit, fromDate, toDate, }: {
        cardId: string;
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCardAuthorizations: ({ cardId, page, limit, fromDate, toDate, }: {
        cardId: string;
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getAllCardsTransactions: ({ page, limit, fromDate, toDate, }: {
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getAllCardsAuthorizations: ({ page, limit, fromDate, toDate, }: {
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCards: (page?: number, limit?: number) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getCustomerCards: (customerId: string, page?: number, limit?: number) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    updateCard: (cardId: string, status: "active" | "inactive") => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getAccountBalance: (accountId: string) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getAccountTransactions: ({ accountId, page, limit, fromDate, toDate, }: {
        accountId: string;
        page?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    transferFunds: (transferData: {
        debitAccountId: string;
        amount: number;
        creditAccountId?: string;
        beneficiaryBankCode?: string;
        beneficiaryAccountNumber?: string;
        narration?: string;
        paymentReference?: string;
    }) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getTransferStatus: (transferId: string) => Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    getLastSyncDate: typeof getLastSyncDate;
};
export default sudoUtils;
