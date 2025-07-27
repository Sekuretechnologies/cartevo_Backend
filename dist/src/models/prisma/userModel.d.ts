import { FilterObject, IncludeObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface UserModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputUser: Prisma.UserUncheckedCreateInput, hashedPassword?: any): Promise<any>;
    update(identifier: string | any, userData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class UserModel {
    static getOne(filters: FilterObject, include?: IncludeObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static getWithRolesAndCompany(filters: {
        roleId?: string;
        companyId?: string;
    }): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputUser: Prisma.UserUncheckedCreateInput, hashedPassword?: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, userData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default UserModel;
