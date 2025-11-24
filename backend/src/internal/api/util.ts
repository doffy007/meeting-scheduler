import { type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { Service as DBService } from "../db"; 

const ERROR_STATUS_MAP: Record<string, ContentfulStatusCode> = {
  // User errors
  'UserExistsError': 409,
  'UserNotFoundError': 404,
  'DeleteTokenError': 500,
  'InvalidPasswordError': 401,
  'SuspiciousEmailError': 400,
  
  // Organizer Settings errors
  'InvalidWorkingHoursError': 400,
  'InvalidTimezoneError': 400,
  'InvalidBlackoutDatesError': 400,
  
  // Booking errors
  'BookingNotFoundError': 404,
  'SlotNotAvailableError': 409,
  'MinimumNoticeError': 400,
  'InvalidTimeSlotError': 400,
};

const ERROR_MESSAGE_MAP: Record<string, ContentfulStatusCode> = {
  'something wrong with payload format': 400,
  'something wrong with query format': 400,
  'please signin': 401,
  'please verify your account': 403,
  'insufficient roles': 403,
  'not found': 404,
  'has no access': 403,
  'upstream error': 502,
  'not implemented': 501,
  'bad request': 400,
  'forbidden': 403,
  'Missing required fields: invitee_name, invitee_email, start_time': 400,
  'Invalid email format': 400,
  'Organizer not found': 404,
};

export const ErrPayload = new Error("something wrong with payload format");
export const ErrQuery = new Error("something wrong with query format");
export const ErrUnauthorized = new Error("please signin");
export const ErrUnverified = new Error("please verify your account");
export const ErrInsufficientRoles = new Error("insufficient roles");
export const ErrNotFound = new Error("not found");
export const ErrNoAccess = new Error("has no access");
export const ErrUpstream = new Error("upstream error");
export const ErrNotImplemented = new Error("not implemented");
export const BadRequest = new Error("bad request");
export const Forbidden = new Error("forbidden");


export interface APIResponse<T = any> {
  results: T;
  total: number;
}


export function FormatResponse(results: any, total: number): APIResponse {
  if (total === 0 && !results) {
    results = [];
  }
  return { results, total };
}


export function Abort(
  c: Context, 
  code: ContentfulStatusCode | null,
  err: any, 
  respErr: Error | string | null = null
) {
  // Auto-detect status code
  const statusCode = code 
    ?? ERROR_STATUS_MAP[err?.name] 
    ?? ERROR_MESSAGE_MAP[err?.message] 
    ?? 500;
  
  const errorMsg = respErr instanceof Error 
    ? respErr.message 
    : (respErr || err?.message || "Unknown error");
  
  console.error(`[API Error] ${c.req.method} ${c.req.path}`, err);

  throw new HTTPException(statusCode, { 
    message: errorMsg,
    cause: err 
  });
}

export const USER_KEY = 'user'; 

export function HasActiveSession(c: Context): boolean {
  const user = c.get(USER_KEY);
  return !!user && user.id !== "0" && user.id !== "";
}

export function GetUserID(c: Context, abort: boolean): string {
  const userId = c.get("userId"); 
  if (!userId || userId === "0") {
    const err = new Error(`invalid user id: ${userId}`);
    if (abort) Abort(c, 400, err, null);
    return "";
  }
  return String(userId);
}

export function GetIntParam(c: Context, key: string, abort: boolean): number {
  const val = c.req.param(key);
  const parsed = parseInt(val, 10);

  if (isNaN(parsed)) {
    if (abort) {
      Abort(c, 400, new Error(`invalid numeric param ${key}: ${val}`), null);
    }
    return 0;
  }
  return parsed;
}


export function GetStringUUIDParam(c: Context, key: string, abort: boolean): string {
  const val = c.req.param(key);

  if (!val) {
    if (abort) {
      Abort(c, 400, new Error(`invalid string param ${key}`), null);
    }
    return "";
  }
  return val;
}


export function GetIntQuery(c: Context, key: string, abort: boolean): number {
  const val = c.req.query(key);
  
  if (val) {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      if (abort) {
        Abort(c, 400, new Error(`invalid numeric query ${key}: ${val}`), null);
      }
      return 0;
    }
    return parsed;
  }
  return 0;
}

export function GetBoolQuery(c: Context, key: string, abort: boolean): boolean {
  const val = c.req.query(key);

  if (val) {
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;

    if (abort) {
      Abort(c, 400, new Error(`invalid bool query ${key}: ${val}`), null);
    }
  }
  return false;
}


export async function trackUser(userID: string, ip: string, ua: string): Promise<void> {
  const query = `
    UPDATE "user"
    SET 
        last_seen = NOW(),
        ip_address = $2,
        user_agent = $3
    WHERE id = $1
  `;

  const safeIP = ip || null;
  const safeUA = ua || null;

  try {
    await DBService.query(query, userID, safeIP, safeUA);
  } catch (err) {
    console.error(`[API] Failed to track user ${userID}:`, err);
  }
}


export function SanitizeXFFHeader(c: Context): string {
  const header = c.req.header("X-Forwarded-For") || "";
  let ips = header.split(",").map(s => s.trim());

  if (ips.length > 3) {
    ips = ips.slice(ips.length - 3);
  }

  return ips.join(", ");
}