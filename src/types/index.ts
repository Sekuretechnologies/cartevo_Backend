export type FilterObject = {
  [key: string]: any;
};

export type OrderObject = {
  [key: string]: "asc" | "ASC" | "desc" | "DESC";
};

// export type IncludeObject = { [key: string]: true | string[] };

export type IncludeObject = {
  [key: string]: true | string[] | IncludeObject | { include: IncludeObject };
};
