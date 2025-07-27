import { FilterObject, IncludeObject, OrderObject } from "@/types";

export function buildPrismaQuery(params: {
  filters?: FilterObject;
  order?: OrderObject;
  include?: IncludeObject;
}) {
  const { filters, order, include } = params;
  let where: any = {};

  // Special handling for userCompanyRoles filtering
  let filtersToProcess = filters;
  if (filters && (filters.roleId || filters.companyId)) {
    where.userCompanyRoles = { some: {} };
    if (filters.companyId) {
      where.userCompanyRoles.some.companyId = filters.companyId;
    }
    if (filters.roleId) {
      where.userCompanyRoles.some.roleId = filters.roleId;
    }
    // Remove these keys from filters so they don't get processed again
    const { roleId, companyId, ...restFilters } = filters;
    filtersToProcess = restFilters;
  }

  if (filtersToProcess) {
    for (const [key, value] of Object.entries(filtersToProcess)) {
      // Exact value filtering
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        where[key] = value;
      }
      // Advanced operators: gt, lt, gte, lte, in, notIn, eq, neq
      else if (typeof value === "object" && value !== null) {
        where[key] = {};
        if (value.in) where[key].in = value.in;
        if (value.nin) where[key].notIn = value.nin;
        if (value.neq !== undefined) where[key].not = value.neq;
        if (value.gt !== undefined) where[key].gt = value.gt;
        if (value.lt !== undefined) where[key].lt = value.lt;
        if (value.gte !== undefined) where[key].gte = value.gte;
        if (value.lte !== undefined) where[key].lte = value.lte;
        if (value.eq !== undefined) where[key] = value.eq; // override if exact match preferred
      }
    }
  }

  let orderBy: any[] = [];
  if (order) {
    for (const [key, value] of Object.entries(order)) {
      orderBy.push({ [key]: value.toLowerCase() === "desc" ? "desc" : "asc" });
    }
  }

  let includeObj: any = undefined;
  if (include) {
    includeObj = buildInclude(include);
  }

  return { where, orderBy, ...(includeObj ? { include: includeObj } : {}) };
}

function buildInclude(include: IncludeObject): any {
  const includeObj: any = {};
  for (const [key, value] of Object.entries(include)) {
    if (value === true) {
      includeObj[key] = true;
    } else if (Array.isArray(value)) {
      includeObj[key] = { select: {} };
      for (const field of value) {
        includeObj[key].select[field] = true;
      }
    } else if (typeof value === "object" && value !== null) {
      if ("include" in value) {
        includeObj[key] = {
          include: buildInclude(value.include as IncludeObject),
        };
      } else {
        // support direct nested include objects
        includeObj[key] = buildInclude(value as IncludeObject);
      }
    }
  }
  return includeObj;
}
