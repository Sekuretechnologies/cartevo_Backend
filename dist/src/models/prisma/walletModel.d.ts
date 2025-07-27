import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface WalletModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputWallet: Prisma.WalletUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, walletData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class WalletModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputWallet: Prisma.WalletUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, walletData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default WalletModel;
