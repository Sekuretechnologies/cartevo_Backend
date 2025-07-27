import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface CompanyModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputCompany: Prisma.CompanyUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, companyData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class CompanyModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputCompany: Prisma.CompanyUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, companyData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default CompanyModel;
