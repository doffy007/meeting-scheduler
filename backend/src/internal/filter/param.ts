import { type Filter, getFilters } from "./filter";
import { type Sort, getSorts, composeSorts } from "./sort";
import { type Paging, getPaging } from "./paging";

export interface Params {
  dateRange?: [Date, Date];
  days?: number;
  filters: Filter[];
  page: Paging;
  search?: string;
  sorts: Sort[];
}

export function getParams(query: Record<string, string | string[]>): Params {
  return {
    dateRange: getDateRange(query),
    days: getDays(query),
    filters: getFilters(query),
    page: getPaging(query),
    search: getSearch(query),
    sorts: getSorts(query),
  };
}

// helpers
function getSearch(query: Record<string, string | string[]>): string | undefined {
  const s = query["search"];
  if (!s) return undefined;

  const value = Array.isArray(s) ? s[0] : s;

  if (!value) return undefined; 
  return value.trim();
}


function getDays(query: Record<string, string | string[]>): number | undefined {
  const d = query["days"];
  if (!d) return undefined;

  const value = Array.isArray(d) ? d[0] : d;
  if (!value) return undefined; 

  const n = parseInt(value, 10);
  return n > 0 ? n : undefined;
}


function getDateRange(query: Record<string, string | string[]>): [Date, Date] | undefined {
  const start = query["start"];
  if (!start) return undefined;

  const startStr = Array.isArray(start) ? start[0] : start;
  if (!startStr) return undefined;
  const startDate = new Date(startStr);

  const end = query["end"];
  const endStr = Array.isArray(end) ? end[0] : end;
  const endDate = endStr ? new Date(endStr) : startDate;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return undefined;
  return [startDate, endDate];
}

// optional: clean string
export function cleanString(s: string): string {
  return s.replace(/[^a-zA-Z0-9_ ]+/g, "");
}
