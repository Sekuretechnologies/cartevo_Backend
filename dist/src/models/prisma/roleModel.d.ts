import { FilterObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface RoleModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputRole: Prisma.RoleUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, roleData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class RoleModel {
    static getOne(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputRole: Prisma.RoleUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, roleData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
}
export default RoleModel;
