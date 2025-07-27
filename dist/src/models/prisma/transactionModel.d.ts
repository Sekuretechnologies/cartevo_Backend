import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface TransactionModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputTransaction: Prisma.TransactionUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, transactionData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class TransactionModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputTransaction: Prisma.TransactionUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, transactionData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default TransactionModel;
