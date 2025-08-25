import { FilterObject, IncludeObject } from "@/types";
import { Prisma } from "@prisma/client";
export interface CardModelInterface {
    getOne(filters: FilterObject): Promise<any>;
    get(filters?: FilterObject): Promise<any>;
    create(inputCard: Prisma.CardUncheckedCreateInput): Promise<any>;
    update(identifier: string | any, cardData: any): Promise<any>;
    delete(identifier: string | any): Promise<any>;
}
declare class CardModel {
    static getOne(filters: FilterObject, include?: IncludeObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static get(filters?: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static create(inputCard: Prisma.CardUncheckedCreateInput): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static update(identifier: string | any, cardData: any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static delete(identifier: string | any): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static count(filters: FilterObject): Promise<import("@/utils/shared/fnOutputHandler").OutputProps>;
    static operation<T>(callback: (prisma: any) => Promise<T>): Promise<T>;
}
export default CardModel;
