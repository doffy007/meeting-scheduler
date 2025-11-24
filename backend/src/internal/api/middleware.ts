import { createMiddleware } from "hono/factory";
import * as api from "../api/util.js";
import { Service as DBService } from "../db";
import { Service as JWTService } from "../jwt";
import { USER_KEY } from "../api/util.js"; 

type Env = {
  Variables: {
    user: {
      id: string;
    };
    userId: string;
    role?: string;
  };
};


export const SetupParams = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    throw api.Abort(c, null, new Error("missing Authorization token"));
  }

  const parts = authHeader.split(" ");
  
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    throw api.Abort(c, null, new Error("invalid authorization header"));
  }

  const tokenString = parts[1] as string;
  let userID = "";

  try {
    const claims = await JWTService.verify(tokenString);
    
    if (!claims || !claims.id) { 
      throw new Error("invalid token payload: missing id");
    }

    userID = String(claims.id); 
  } catch (err) {
    if (err instanceof Error && err.message === "invalid token payload: missing id") {
      throw api.Abort(c, null, err);
    }
    throw api.Abort(c, null, new Error("invalid or expired token"));
  }

  try {
    const query = `
      SELECT EXISTS (
        SELECT 1 
        FROM device 
        WHERE user_id = $1
        AND token = $2
      ) as exists
    `;

    const row = await DBService.queryRow<{ exists: boolean }>(query, userID, tokenString);

    if (!row || !row.exists) {
      throw new Error("session invalid or logged out");
    }

  } catch (err) {
    if (err instanceof Error && err.message === "session invalid or logged out") {
      throw api.Abort(c, null, err);
    }
    
    throw api.Abort(c, null, new Error("database query error"));
  }

  const ip = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "127.0.0.1";
  const ua = c.req.header("User-Agent") || "";
  
  api.trackUser(userID, ip, ua).catch((err) => {
    console.error("[TrackUser Error]", err);
  });

  c.set("userId", userID);

  await next();
});

export const NoAnonymous = createMiddleware<Env>(async (c, next) => {
  const userId = c.get("userId");
  
  if (!userId || userId === "0" || userId === "") {
    return api.Abort(c, 401, api.ErrUnauthorized, null);
  }
  
  await next();
});

export function MustHaveRoles(...roles: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const userId = c.get("userId");

    if (userId && userId !== "0") {
      try {
        const query = `
          SELECT EXISTS(
            SELECT 1
            FROM "user"
            WHERE id = $1 AND role = ANY($2)
          ) as exists
        `;

        const row = await DBService.queryRow<{ exists: boolean }>(query, [userId, roles]);

        if (!row || !row.exists) {
          throw api.ErrInsufficientRoles;
        }
      } catch (err) {
        console.error("roles check failed", err);
        throw api.ErrInsufficientRoles;
      }
    } else {
      throw api.ErrInsufficientRoles;
    }

    await next();
  });
}

export function MustNotHaveRoles(...roles: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const userId = c.get("userId");

    if (!userId || userId === "0") {
      throw api.ErrInsufficientRoles;
    }

    try {
      const query = `
        SELECT NOT EXISTS(
          SELECT 1
          FROM "user"
          WHERE id = $1 AND role = ANY($2)
        ) as allowed
      `;

      const row = await DBService.queryRow<{ allowed: boolean }>(query, userId, roles);

      if (!row || !row.allowed) {
        throw api.ErrInsufficientRoles;
      }
    } catch (err) {
      console.error("roles check failed", err);
      throw api.ErrInsufficientRoles;
    }

    await next();
  });
}