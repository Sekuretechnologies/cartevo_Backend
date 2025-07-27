import { FilterObject, IncludeObject, OrderObject } from "@/types";
export declare function buildPrismaQuery(params: {
    filters?: FilterObject;
    order?: OrderObject;
    include?: IncludeObject;
}): {
    include?: any;
    where: any;
    orderBy: any[];
};
