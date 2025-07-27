import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface UserCompanyRoleModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(input: Prisma.UserCompanyRoleUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, data: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class UserCompanyRoleModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(input: Prisma.UserCompanyRoleUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, data: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static count(filters: FilterObject): Promise<number>;
}
export default UserCompanyRoleModel;
