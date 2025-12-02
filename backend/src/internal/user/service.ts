import { Service as DBService } from "../db";
import { Service as UIDService } from "../uid";
import { Service as JWTService } from "../jwt";
import { Service as OrganizerService } from "../organizer/service"; 
import type { User } from "./user";
import {
  hashPassword,
  compareHashAndPassword,
  validateEmail,
  isValidPassword,
  UserNotFoundError,
  UserExistsError,
  InvalidPasswordError,
} from "./user.js";
import { jwt } from "zod";
import { id } from "zod/locales";
import type { Organizer } from "../organizer/organizer.js";

export interface IUserService {
  signIn(username: string, password: string): Promise<{user: User, token: string}>;
  signOut(id: string, token: string): Promise<boolean>;
  createUser(req: User): Promise<User>;
  getUser(id: string): Promise<User | null>;
  updateUser(req: User, updatedFields: string[]): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  createTokenIfNotExisting(id: string, username: string, device: string): Promise<string>;
  getUserByToken(token: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User>;
  verifyEmail(id: string, token: string): Promise<boolean>;
  isUsernameOrEmailExists(username: string | null, email: string): Promise<boolean>;
}

class UserServiceImpl implements IUserService {
  constructor(private db: typeof DBService) {}

  async signIn(username: string, password: string): Promise<{user: User, token: string}> {
    const user = await this.db.queryRow<User>(
      `SELECT
        id,
        name,
        username,
        password,
        bio,
        email,
        email_verified,
        role,
        gender,
        language,
        created_at,
        updated_at,
        deactivated_at,
        deleted_at,
        last_seen,
        ip_address,
        user_agent,
        country_code,
        phone_number,
        location,
        nationality,
        national_id_number
      FROM "user"
      WHERE username = $1 AND deleted_at IS NULL`,
      username
    );

    if (!user) {
      throw new UserNotFoundError();
    }

    await compareHashAndPassword(user.password, password);

    const token = await this.createTokenIfNotExisting(
        user.id,
        user.username,
        user.user_agent ?? "unknown"
    );

    return { user, token };
  }

  async createUser(req: User): Promise<User> {
    if (!req.id) {
      req.id = UIDService.generate();
    }

    const exists = await this.isUsernameOrEmailExists(req.username, req.email || "");
    if (exists) {
      throw new UserExistsError();
    }

    validateEmail(req);

    const now = new Date();
    req.created_at = now;
    req.updated_at = now;

    req.password = await hashPassword(req.password);

    await this.db.transaction(null, async (tx) => {
      await tx`
        INSERT INTO "user" (
          id,
          name,
          username,
          password,
          bio,
          email,
          language,
          created_at,
          updated_at,
          country_code,
          phone_number,
          location,
          nationality,
          national_id_number
        ) VALUES (
          ${req.id},
          ${req.name},
          ${req.username},
          ${req.password},
          ${req.bio},
          ${req.email},
          ${req.language},
          ${req.created_at},
          ${req.updated_at},
          ${req.country_code},
          ${req.phone_number},
          ${req.location},
          ${req.nationality},
          ${req.national_id_number}
        )
      `;

      await tx`
        INSERT INTO organizer (
          id,
          user_id,
          name,
          email,
          phone,
          address,
          created_at,
          updated_at
        ) VALUES (
          ${UIDService.generate()},
          ${req.id},
          ${req.name},
          ${req.email},
          ${req.phone_number},
          ${req.location},
          ${now},
          ${now}
        )
      `;
    });

    // Remove sensitive data before returning
    req.password = "";
    req.email = null;
    req.gender = null;
    req.birthdate = null;

    return req;
  }

  async getUser(id: string): Promise<User | null> {
    const user = await this.db.queryRow<User>(
      `SELECT
        id,
        name,
        username,
        bio,
        email,
        email_verified,
        role,
        gender,
        language,
        created_at,
        updated_at,
        deactivated_at,
        deleted_at,
        last_seen,
        ip_address,
        user_agent,
        country_code,
        phone_number,
        location,
        nationality,
        national_id_number
      FROM "user"
      WHERE id = $1 AND deleted_at IS NULL`,
      id
    );

    if (user) {
      user.password = "";
      user.email = null;
      user.gender = null;
      user.birthdate = null;
    }

    return user;
  }

  async updateUser(req: User, updatedFields: string[]): Promise<User> {
    if (!req.id) {
      throw new UserNotFoundError();
    }

    req.updated_at = new Date();

    const setClauses: string[] = [];
    const args: any[] = [];
    let paramIndex = 1;

    for (const field of updatedFields) {
      switch (field) {
        case "name":
          setClauses.push(`name = $${paramIndex++}`);
          args.push(req.name);
          break;
        case "username":
          const exists = await this.isUsernameOrEmailExists(req.username, req.email || "");
          if (exists) {
            throw new Error("username already exists");
          }
          setClauses.push(`username = $${paramIndex++}`);
          args.push(req.username);
          break;
        case "bio":
          setClauses.push(`bio = $${paramIndex++}`);
          args.push(req.bio);
          break;
        case "language":
          setClauses.push(`language = $${paramIndex++}`);
          args.push(req.language);
          break;
        case "gender":
          setClauses.push(`gender = $${paramIndex++}`);
          args.push(req.gender);
          break;
        case "birthdate":
          setClauses.push(`birthdate = $${paramIndex++}`);
          args.push(req.birthdate);
          break;
        case "country_code":
          setClauses.push(`country_code = $${paramIndex++}`);
          args.push(req.country_code);
          break;
        case "phone_number":
          setClauses.push(`phone_number = $${paramIndex++}`);
          args.push(req.phone_number);
          break;
        case "location":
          setClauses.push(`location = $${paramIndex++}`);
          args.push(req.location);
          break;
        case "nationality":
          setClauses.push(`nationality = $${paramIndex++}`);
          args.push(req.nationality);
          break;
        case "national_id_number":
          setClauses.push(`national_id_number = $${paramIndex++}`);
          args.push(req.national_id_number);
          break;
        case "password":
          if (!isValidPassword(req.password)) {
            throw new Error("invalid password format");
          }
          req.password = await hashPassword(req.password);
          setClauses.push(`password = $${paramIndex++}`);
          args.push(req.password);
          break;
      }
    }

    if (setClauses.length > 0) {
        setClauses.push(`updated_at = $${paramIndex++}`);
        args.push(req.updated_at);

        const idParamIndex = paramIndex++;
        args.push(req.id);

        await this.db.transaction(null, async (tx) => {
            await tx
            `UPDATE "user"
            SET ${setClauses.join(", ")}
            WHERE id = $${idParamIndex}`,
            args
        });
    }

    const result = await this.getUser(req.id);
    return result || req;
  }

  async isUsernameOrEmailExists(username: string | null, email: string): Promise<boolean> {
    if (username) {
      const exists = await this.db.queryRow<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1
          FROM "user"
          WHERE username = $1
        ) as exists`,
        username
      );

      if (exists?.exists) {
        return true;
      }
    }

    if (email) {
      const exists = await this.db.queryRow<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1
          FROM "user"
          WHERE email = $1
        ) as exists`,
        email
      );

      if (exists?.exists) {
        return true;
      }
    }

    return false;
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.db.transaction(null, async (tx) => {
      await tx`
        UPDATE "user"
        SET deleted_at = ${new Date()},
            updated_at = ${new Date()}
        WHERE id = ${id}
      `;
    });

    return true;
  }

  async createTokenIfNotExisting(id: string, username: string, device: string): Promise<string> {
    interface DeviceRow {
      token: string;
      created_at: Date;
    }

    const deviceRow = await this.db.queryRow<DeviceRow>(
      `SELECT token, created_at
       FROM device
       WHERE user_id = $1`,
      id
    );

    if (deviceRow?.token) {
      try {
        JWTService.verify(deviceRow.token);
        return deviceRow.token;
      } catch (err) {
      
    }
    }

    const newToken = JWTService.sign({ id, username }, { expiresIn: "7d" });

    await this.db.raw.begin(async (sql) => {
      await sql`
        INSERT INTO device (user_id, token, device, created_at, updated_at)
        VALUES (${id}, ${newToken}, ${device}, NOW(), NOW())
        ON CONFLICT (user_id, device) DO UPDATE 
        SET token = EXCLUDED.token, updated_at = NOW()
      `;
    });

    return newToken;
  }

    async getUserByToken(token: string): Promise<User | null> {
    JWTService.verify(token);

    const payload = JWTService.decode<{ id: string }>(token);
    if (!payload?.id) {
        return null;
    }

    const result = await this.db.query<{ user_id: string }>(
        `SELECT user_id 
        FROM device 
        WHERE token = $1 AND user_id = $2`,
        token, payload.id 
    );

    const deviceRow = result[0];
    if (!deviceRow) {
        return null;
    }

    return this.getUser(deviceRow.user_id);
    }

  async signOut(id: string, token: string): Promise<boolean> {
    await this.db.raw.begin(async (sql) => {
      await sql`
        UPDATE device
        SET token = NULL,
            deleted_at = ${new Date()}
        WHERE user_id = ${id}
      `;
    });

    return true;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.db.queryRow<User>(
      `SELECT
        id,
        name,
        username,
        bio,
        email,
        email_verified,
        role,
        gender,
        language,
        created_at,
        updated_at,
        deactivated_at,
        deleted_at,
        last_seen,
        ip_address,
        user_agent,
        country_code,
        phone_number,
        location,
        nationality,
        national_id_number
      FROM "user"
      WHERE email = $1 AND deleted_at IS NULL`,
      email
    );

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

  async verifyEmail(id: string, token: string): Promise<boolean> {
    const user = await this.getUserByToken(token);
    if (!user) {
      throw new UserNotFoundError();
    }

    await this.db.raw.begin(async (sql) => {
      await sql`
        UPDATE "user"
        SET email_verified = true,
            updated_at = ${new Date()}
        WHERE id = ${user.id}
      `;
    });

    return true;
  }
}

export const Service = new UserServiceImpl(DBService);

export default Service;