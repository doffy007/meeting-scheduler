export interface Paging {
  limit: number;
  offset: number;
}

export function getPaging(query: Record<string, string | string[]>): Paging {
  const rawLimit = query["limit"];
  const rawOffset = query["offset"];

  const limitStr = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
  const offsetStr = Array.isArray(rawOffset) ? rawOffset[0] : rawOffset;

  const limit = limitStr ? parseInt(limitStr, 10) : 25;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  return { limit, offset };
}
