import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface CustomerModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputCustomer: Prisma.CustomerUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, customerData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class CustomerModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputCustomer: Prisma.CustomerUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, customerData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default CustomerModel;
