"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrismaQuery = buildPrismaQuery;
function buildPrismaQuery(params) {
    const { filters, order, include } = params;
    let where = {};
    let filtersToProcess = filters;
    if (filters && (filters.roleId || filters.companyId)) {
        where.userCompanyRoles = { some: {} };
        if (filters.companyId) {
            where.userCompanyRoles.some.companyId = filters.companyId;
        }
        if (filters.roleId) {
            where.userCompanyRoles.some.roleId = filters.roleId;
        }
        const { roleId, companyId, ...restFilters } = filters;
        filtersToProcess = restFilters;
    }
    if (filtersToProcess) {
        for (const [key, value] of Object.entries(filtersToProcess)) {
            if (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") {
                where[key] = value;
            }
            else if (typeof value === "object" && value !== null) {
                where[key] = {};
                if (value.in)
                    where[key].in = value.in;
                if (value.nin)
                    where[key].notIn = value.nin;
                if (value.neq !== undefined)
                    where[key].not = value.neq;
                if (value.gt !== undefined)
                    where[key].gt = value.gt;
                if (value.lt !== undefined)
                    where[key].lt = value.lt;
                if (value.gte !== undefined)
                    where[key].gte = value.gte;
                if (value.lte !== undefined)
                    where[key].lte = value.lte;
                if (value.eq !== undefined)
                    where[key] = value.eq;
            }
        }
    }
    let orderBy = [];
    if (order) {
        for (const [key, value] of Object.entries(order)) {
            orderBy.push({ [key]: value.toLowerCase() === "desc" ? "desc" : "asc" });
        }
    }
    let includeObj = undefined;
    if (include) {
        includeObj = buildInclude(include);
    }
    return { where, orderBy, ...(includeObj ? { include: includeObj } : {}) };
}
function buildInclude(include) {
    const includeObj = {};
    for (const [key, value] of Object.entries(include)) {
        if (value === true) {
            includeObj[key] = true;
        }
        else if (Array.isArray(value)) {
            includeObj[key] = { select: {} };
            for (const field of value) {
                includeObj[key].select[field] = true;
            }
        }
        else if (typeof value === "object" && value !== null) {
            if ("include" in value) {
                includeObj[key] = {
                    include: buildInclude(value.include),
                };
            }
            else {
                includeObj[key] = buildInclude(value);
            }
        }
    }
    return includeObj;
}
//# sourceMappingURL=functions.js.map