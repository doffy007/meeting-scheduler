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
export const Like = "like";
export const Null = "null";
export const True = "true";
export const False = "false";

// Types
export interface Filter {
  column: string;
  operator: string;
  value: string;
  columnOverridden?: boolean;
}

export interface FilterOptions {
  allowedColumns?: string[];
  tableAlias?: string;
}

// Supported operators set for validation
const SUPPORTED_OPERATORS = new Set([
  Equal,
  NotEqual,
  LessThan,
  GreaterThan,
  LessThanEqual,
  GreaterThanEqual,
  In,
  NotIn,
  Is,
  IsNot,
  Like,
]);

const VALID_IS_VALUES = new Set([Null, True, False]);

/**
 * Parse filter parameters from query string
 * Format: filter=column:operator:value
 * Example: filter=role:eq:admin&filter=age:gt:18
 */
export function getFilters(query: Record<string, string | string[]>): Filter[] {
  const res: Filter[] = [];
  const fs = query["filter"];
  
  if (!fs) {
    return [];
  }

  const filters = Array.isArray(fs) ? fs : [fs];

  for (const f of filters) {
    const parts = f.split(":");
    
    if (parts.length !== 3) {
      console.warn(`[Filter] Invalid format, expected 3 parts: ${f}`);
      continue;
    }

    const [column, operator, value] = parts;

    if (!column || !operator || !value) {
      console.warn(`[Filter] Empty column, operator, or value: ${f}`);
      continue;
    }

    if (!SUPPORTED_OPERATORS.has(operator)) {
      console.warn(`[Filter] Unsupported operator: ${operator}`);
      continue;
    }

    res.push({ column, operator, value });
  }

  return res;
}

/**
 * Compose SQL WHERE clause from filters
 * Mutates args array by adding parameter values
 * 
 * @param filters - Array of filter objects
 * @param args - Array to collect query parameters (mutated in place)
 * @param options - Optional configuration (whitelist, table alias)
 * @returns SQL WHERE clause string (including "WHERE" keyword)
 */
export function composeDbQueryFromFilters(
  filters: Filter[],
  args: any[],
  options?: FilterOptions
): string {
  const conditions: string[] = [];
  const { allowedColumns, tableAlias } = options ?? {};

  for (const f of filters) {
    // Skip if column override is set
    if (f.columnOverridden) {
      continue;
    }

    // Validate column against whitelist
    if (allowedColumns && !allowedColumns.includes(f.column)) {
      console.warn(
        `[Filter] Column not in whitelist: ${f.column}. Allowed: ${allowedColumns.join(", ")}`
      );
      continue;
    }

    // Build column name with optional table alias
    const col = tableAlias ? `${tableAlias}.${f.column}` : f.column;

    // Build condition based on operator
    const condition = buildCondition(f, col, args);
    
    if (condition) {
      conditions.push(condition);
    }
  }

  return conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
}

/**
 * Build a single SQL condition based on filter operator
 */
function buildCondition(filter: Filter, column: string, args: any[]): string | null {
  const paramIndex = args.length + 1;

  switch (filter.operator) {
    case Equal:
      args.push(filter.value);
      return `${column} = $${paramIndex}`;

    case NotEqual:
      args.push(filter.value);
      return `${column} <> $${paramIndex}`;

    case LessThan:
      args.push(filter.value);
      return `${column} < $${paramIndex}`;

    case GreaterThan:
      args.push(filter.value);
      return `${column} > $${paramIndex}`;

    case LessThanEqual:
      args.push(filter.value);
      return `${column} <= $${paramIndex}`;

    case GreaterThanEqual:
      args.push(filter.value);
      return `${column} >= $${paramIndex}`;

    case In: {
      const values = filter.value.split(",").map((v) => v.trim()).filter(Boolean);
      
      if (values.length === 0) {
        console.warn(`[Filter] Empty IN clause for column: ${column}`);
        return null;
      }
      
      args.push(values);
      return `${column} = ANY($${paramIndex})`;
    }

    case NotIn: {
      const values = filter.value.split(",").map((v) => v.trim()).filter(Boolean);
      
      if (values.length === 0) {
        console.warn(`[Filter] Empty NOT IN clause for column: ${column}`);
        return null;
      }
      
      args.push(values);
      return `NOT (${column} = ANY($${paramIndex}))`;
    }

    case Is:
      return buildIsCondition(filter, column, false);

    case IsNot:
      return buildIsCondition(filter, column, true);

    case Like:
      args.push(`%${filter.value}%`);
      return `${column} ILIKE $${paramIndex}`;

    default:
      console.warn(`[Filter] Unknown operator: ${filter.operator}`);
      return null;
  }
}

/**
 * Build IS/IS NOT conditions for NULL, TRUE, FALSE
 */
function buildIsCondition(filter: Filter, column: string, negated: boolean): string | null {
  const value = filter.value.toLowerCase();

  if (!VALID_IS_VALUES.has(value)) {
    console.warn(
      `[Filter] Invalid ${negated ? "ISNOT" : "IS"} value: ${filter.value}. Expected: null, true, or false`
    );
    return null;
  }

  const operator = negated ? "IS NOT" : "IS";

  switch (value) {
    case Null:
      return `${column} ${operator} NULL`;
    case True:
      return `${column} ${operator} TRUE`;
    case False:
      return `${column} ${operator} FALSE`;
    default:
      return null;
  }
}

/**
 * Helper: Validate if a column name is safe (alphanumeric and underscore only)
 * Use this if you want additional validation beyond whitelist
 */
export function isValidColumnName(column: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column);
}