export interface Sort {
  column: string;
  asc: boolean;
}

export function getSorts(query: Record<string, string | string[]>): Sort[] {
  const res: Sort[] = [];
  const ss = query["sort"];
  if (!ss) return [];

  const sorts = Array.isArray(ss) ? ss : [ss];
  for (const s of sorts) {
    if (!s) continue;

    const tokens = s.split(":");
    if (tokens.length !== 2) continue;

    const column = tokens[0]?.trim();
    const order = tokens[1]?.trim().toLowerCase();

    if (!column || !order) continue; 

    const asc = order === "asc";
    res.push({ column, asc });
  }

  return res;
}

export function composeSorts(sorts: Sort[]): string {
  if (!sorts.length) return "";
  return "ORDER BY " + sorts.map(s => `${s.column} ${s.asc ? "ASC" : "DESC"}`).join(", ");
}
