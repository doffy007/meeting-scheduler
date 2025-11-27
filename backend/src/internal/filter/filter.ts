export const Equal = "eq";
export const NotEqual = "neq";
export const LessThan = "lt";
export const GreaterThan = "gt";
export const LessThanEqual = "lte";
export const GreaterThanEqual = "gte";
export const Prefix = "pre";
export const Contain = "con";
export const In = "in";
export const NotIn = "nin";
export const Is = "is";
export const IsNot = "isnot";
export const Null = "null";
export const True = "true";
export const False = "false";
export const Like = "like";

export interface Filter {
  column: string;
  operator: string;
  value: string;
  columnOverridden?: boolean;
}

export function getFilters(query: Record<string, string | string[]>): Filter[] {
  const res: Filter[] = [];
  const fs = query["filter"];
  if (!fs) return [];

  const filters = Array.isArray(fs) ? fs : [fs];
  for (const f of filters) {
    const parts = f.split(":");
    if (parts.length === 3) {
      const [column, operator, value] = parts;
        if (column && operator && value) {
            res.push({ column, operator, value });
        }
    }
  }
  return res;
}

export function composeDbQueryFromFilters(filters: Filter[], args: any[]): { sql: string; args: any[] } {
  const sb: string[] = [];

  filters.forEach((f) => {
    if (f.columnOverridden) return;

    let n = args.length + 1;
    const col = f.column.replace(/[^a-zA-Z0-9_]/g, "");

    switch (f.operator) {
      case Equal:
        args.push(f.value);
        sb.push(`${col} = $${n}`);
        break;
      case NotEqual:
        args.push(f.value);
        sb.push(`${col} <> $${n}`);
        break;
      case LessThan:
        args.push(f.value);
        sb.push(`${col} < $${n}`);
        break;
      case GreaterThan:
        args.push(f.value);
        sb.push(`${col} > $${n}`);
        break;
      case LessThanEqual:
        args.push(f.value);
        sb.push(`${col} <= $${n}`);
        break;
      case GreaterThanEqual:
        args.push(f.value);
        sb.push(`${col} >= $${n}`);
        break;
      case In:
        args.push(f.value.split(","));
        sb.push(`${col} = ANY($${n})`);
        break;
      case NotIn:
        args.push(f.value.split(","));
        sb.push(`NOT (${col} = ANY($${n}))`);
        break;
      case Is:
        switch (f.value.toLowerCase()) {
          case Null:
            sb.push(`${col} IS NULL`);
            break;
          case True:
            sb.push(`${col} IS TRUE`);
            break;
          case False:
            sb.push(`${col} IS FALSE`);
            break;
        }
        break;
      case IsNot:
        switch (f.value.toLowerCase()) {
          case Null:
            sb.push(`${col} IS NOT NULL`);
            break;
          case True:
            sb.push(`${col} IS NOT TRUE`);
            break;
          case False:
            sb.push(`${col} IS NOT FALSE`);
            break;
        }
        break;
      case Like:
        args.push(`%${f.value}%`);
        sb.push(`${col} ILIKE $${n}`);
        break;
      default:
        break;
    }
  });

  const sql = sb.length > 0 ? "WHERE " + sb.join(" AND ") : "";
  return { sql, args };
}
