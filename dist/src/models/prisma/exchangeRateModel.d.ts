import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface ExchangeRateModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputExchangeRate: Prisma.ExchangeRateUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, exchangeRateData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class ExchangeRateModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputExchangeRate: Prisma.ExchangeRateUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, exchangeRateData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static getExchangeRate(companyId: string, fromCurrency: string, toCurrency: string): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static convertCurrency(companyId: string, amount: number, fromCurrency: string, toCurrency: string): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default ExchangeRateModel;
