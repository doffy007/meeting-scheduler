import { createConnection } from "net";
import { toZonedTime } from "date-fns-tz";

/**
 * Get difference between two string arrays
 */
export function stringSliceDiff(a: string[], b: string[]): string[] {
  const diff: string[] = [];
  const vals = new Set(a.map((x) => x.toLowerCase()));

  for (const x of b) {
    if (!vals.has(x.toLowerCase())) {
      diff.push(x);
    }
  }

  return diff;
}

/**
 * Check if string is valid URL
 */
export function isUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol !== "" && u.host !== "";
  } catch {
    return false;
  }
}

/**
 * Trim whitespace from all strings in array (mutates array)
 */
export function trimSpaceSlice(s: string[]): void {
  for (let i = 0; i < s.length; i++) {
    s[i] = s[i]!.trim();
  }
}

/**
 * Check if date a is after date b (by day)
 */
export function timeAfter(a: Date, b: Date): boolean {
  return (
    a.getFullYear() >= b.getFullYear() &&
    getDayOfYear(a) > getDayOfYear(b)
  );
}

/**
 * Check if date a is before date b (by day)
 */
export function timeBefore(a: Date, b: Date): boolean {
  return (
    a.getFullYear() <= b.getFullYear() &&
    getDayOfYear(a) < getDayOfYear(b)
  );
}

/**
 * Check if dates are equal (by day)
 */
export function timeEqual(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    getDayOfYear(a) === getDayOfYear(b)
  );
}

/**
 * Get day of year (1-366)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Map tags in format "key:value" to object
 */
export function mapTags(tags: string[]): Record<string, string[]> {
  const res: Record<string, string[]> = {};

  for (let s of tags) {
    s = s.trim();
    const v = s.split(":");

    if (v.length === 2) {
      const key = v[0]!;
      const value = v[1]!;

      if (!res[key]) {
        res[key] = [value];
      } else {
        res[key]!.push(value);
      }
    }
  }

  return res;
}

/**
 * Check if two strings are equal (case insensitive, null-safe)
 */
export function stringIsEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a === b) return true;
  if (a != null && b != null && a.toLowerCase() === b.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Get outbound IP address
 */
export async function getOutboundIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "8.8.8.8", port: 80 });

    socket.on("connect", () => {
      const address = socket.address();
      socket.end();

      if (address && typeof address === "object" && "address" in address) {
        resolve(address.address);
      } else {
        reject(new Error("Could not get local address"));
      }
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Convert IP address to integer
 */
export function ipToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return 0;

  return parts.reduce((acc, octet) => {
    return (acc << 8) + parseInt(octet || "0", 10);
  }, 0);
}

/**
 * Remove duplicate strings from array
 */
export function removeDuplicateStrings(s: string[]): string[] {
  return Array.from(new Set(s));
}

/**
 * Get field names from JSON object
 */
export function getUpdatedJSONFields(b: string | Buffer): string[] | null {
  try {
    const str = typeof b === "string" ? b : b.toString();
    const m = JSON.parse(str) as Record<string, any>;
    return Object.keys(m);
  } catch (err) {
    console.error("Failed to parse JSON fields:", err);
    return null;
  }
}

/**
 * Generate all permutations of string array
 */
export function permutateStrings(
  w: string[],
  fn: (arr: string[]) => void
): void {
  permutateStringsHelper(w, fn, 0);
}

function permutateStringsHelper(
  w: string[],
  fn: (arr: string[]) => void,
  i: number
): void {
  if (i > w.length) {
    fn(w);
    return;
  }

  permutateStringsHelper(w, fn, i + 1);

  for (let j = i + 1; j < w.length; j++) {
    [w[i], w[j]] = [w[j]!, w[i]!];
    permutateStringsHelper(w, fn, i + 1);
    [w[i], w[j]] = [w[j]!, w[i]!];
  }
}

/**
 * Convert phone number to E.164 format
 */
export function toE164(code: string, phone: string): string {
  if (phone[0] === "0") {
    phone = phone.slice(1);
  }

  if (code[0] !== "+") {
    code = "+" + code;
  }

  return `${code}${phone}`;
}

/**
 * Get next power of 2
 */
export function nextPowOf2(n: number): number {
  let k = 1;
  while (k < n) {
    k = k << 1;
  }
  return k;
}

/**
 * Convert string to nullable string (empty string becomes null)
 */
export function nilString(s: string): string | null {
  return s === "" ? null : s;
}

/**
 * Convert boolean to nullable boolean
 */
export function nilBool(b: boolean): boolean {
  return b;
}

/**
 * Convert nullable string to empty string
 */
export function nilToEmptyString(s: string | null | undefined): string {
  return s ?? "";
}

/**
 * Convert any type to integer
 */
export function anyToInt(v: any): number {
  if (typeof v === "number") {
    return Math.floor(v);
  }
  if (typeof v === "string") {
    return parseInt(v, 10) || 0;
  }
  return 0;
}

/**
 * Convert any type to nullable string
 */
export function anyToNilString(s: any): string | null {
  if (typeof s === "string") {
    return s;
  }
  return null;
}

/**
 * Get max of two strings
 */
export function max(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Convert any type to float64
 */
export function anyToFloat64(v: any): number {
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "string") {
    if (v === "F" || v === "DQ" || v === "WO") {
      return 0;
    }
    const f = parseFloat(v);
    return isNaN(f) ? 0 : f;
  }
  return 0;
}

/**
 * Parse date string in format YYYY-MM-DD
 */
export function parseDate(s: string): Date | null {
  try {
    if (s.endsWith(" BC")) {
      const dateStr = s.replace(" BC", "");
      const t = new Date(dateStr);
      if (isNaN(t.getTime())) return null;

      // Convert to BC (negative year)
      return new Date(-t.getFullYear(), t.getMonth(), t.getDate());
    }

    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t;
  } catch {
    return null;
  }
}

export function convertToTimezone(date: Date | undefined | null, tz: string): Date {
  if (!date) return new Date(); 
  return toZonedTime(date, tz);
}
