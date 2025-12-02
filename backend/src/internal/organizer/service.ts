import { Service as DBService } from "../db";
import type { Params } from "../filter/param.js";
import type { OrganizerSettings } from "../setting/setting.js";
import { Service as UIDService } from "../uid";
import  type { Organizer } from "./organizer.js";
import { composeDbQueryFromFilters } from "../filter/filter";
import { composeSorts } from "../filter/sort";
import { FormatResponse, type APIResponse } from "../api/util.js";

export interface IOrganizerService {
    createOrganizer(req: Organizer): Promise<Organizer>;
    updateOrganizer(req: Organizer, updatedFields: string[], userId: string): Promise<Organizer>;
    getOrganizer(id: string): Promise<Organizer | null>;
    getOrganizerByUserId(userId: string): Promise<Organizer | null>;  
    listOrganizer(params: Params): Promise<APIResponse<Organizer[]>>;
}   

class OrganizerService implements IOrganizerService {
    private db: typeof DBService;
    constructor() {
        this.db = DBService; 
    }

  async createOrganizer(req: Organizer): Promise<Organizer> {
    if (!req.id) {
      req.id = UIDService.generate();
    }

    const now = new Date();
    req.created_at = now;
    req.updated_at = now;

    await this.db.transaction(null, async (tx) => {
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
          ${req.id}, 
          ${req.user_id}, 
          ${req.name}, 
          ${req.email}, 
          ${req.phone}, 
          ${req.address}, 
          ${req.created_at}, 
          ${req.updated_at}
        )
      `;
    });

    return req
  }

  async updateOrganizer(req: Organizer, updatedFields: string[], userId: string): Promise<Organizer> {
    const now = new Date();
    req.updated_at = now;
    updatedFields.push("updated_at");
    
    const setClauses = updatedFields.map((field, index) => `${field} = $${index + 3}`);
    const query = `
      UPDATE organizer
      SET ${setClauses.join(", ")}
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, name, email, phone, address, created_at, updated_at, deleted_at
    `;

    const values = [req.id, userId];
    for (const field of updatedFields) {
      values.push((req as Record<string, any>)[field]);
    }

    const result = await this.db.queryRow<Organizer>(query, ...values);
    
    if (!result) {
      throw new Error("Organizer not found or you don't have permission to update");
    }

    return result;
  }

  async getOrganizer(id: string): Promise<(Organizer & OrganizerSettings) | null> {
    const query = `
      SELECT 
        a.id, a.user_id, a.name, a.email, a.phone, a.address, a.created_at, a.updated_at, a.deleted_at,
        b.meeting_duration_minutes,
        b.buffer_before_minutes,
        b.buffer_after_minutes,
        b.working_hours,
        b.timezone,
        b.id as id_organizer,
        b.blackout_dates
      FROM organizer a
      LEFT JOIN organizer_settings b ON b.organizer_id = a.id
      WHERE a.id = $1 AND a.deleted_at IS NULL
    `;

    const row = await this.db.queryRow<Organizer & OrganizerSettings>(query, id);
    return row;
  }

  async getOrganizerByUserId(userId: string): Promise<Organizer | null> {
    const query = `
      SELECT id, user_id, name, email, phone, address, created_at, updated_at, deleted_at
      FROM organizer
      WHERE user_id = $1 and deleted_at IS NULL
    `;
  
    const row = await this.db.queryRow<Organizer>(query, userId);
    return row;
  } 

  async listOrganizer(params: Params): Promise<APIResponse<Organizer[]>> {
    const args: any[] = [];
    
    const allowedColumns = [
      "id", "user_id", "name", "email", "phone", "address",
      "created_at", "updated_at"
    ];

    let sql = `
      SELECT 
        a.id,
        a.user_id,
        a.name,
        a.email,
        a.phone,
        a.address,
        a.created_at,
        a.updated_at,
        b.meeting_duration_minutes,
        b.buffer_before_minutes,
        b.buffer_after_minutes,
        b.minimum_notice_hours,
        b.working_hours,
        b.timezone,
        b.blackout_dates
      FROM organizer a
      LEFT JOIN organizer_settings b ON b.organizer_id = a.id
      WHERE a.deleted_at IS NULL
    `;

    const filterSql = composeDbQueryFromFilters(params.filters, args, {
      allowedColumns,
    });

    if (filterSql) {
      sql += ` AND ${filterSql.replace("WHERE ", "")}`;
    }

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += ` AND (
        a.name ILIKE $${args.length} OR 
        a.email ILIKE $${args.length}
      )`;
    }

    if (params.sorts?.length) {
      const validatedSorts = params.sorts.filter((s) =>
        allowedColumns.includes(s.column)
      );
      
      if (validatedSorts.length > 0) {
        const prefixedSorts = validatedSorts.map(s => ({
          ...s,
          column: `a.${s.column}`
        }));
        sql += ` ${composeSorts(prefixedSorts)}`;
      }
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    
    args.push(limit, offset);
    sql += ` LIMIT $${args.length - 1} OFFSET $${args.length}`;

    const rows = await DBService.query<Organizer>(sql, ...args);

    const countArgs: any[] = [];
    let countSql = `
      SELECT COUNT(*) as count 
      FROM organizer a 
      WHERE a.deleted_at IS NULL
    `;

    const countFilterSql = composeDbQueryFromFilters(params.filters, countArgs, {
      allowedColumns,
    });

    if (countFilterSql) {
      countSql += ` AND ${countFilterSql.replace("WHERE ", "")}`;
    }

    if (params.search) {
      countArgs.push(`%${params.search}%`);
      countSql += ` AND (
        a.name ILIKE $${countArgs.length} OR 
        a.email ILIKE $${countArgs.length}
      )`;
    }

    const countRows = await DBService.query<{ count: string }>(
      countSql,
      ...countArgs
    );
    const total = parseInt(countRows[0]?.count ?? "0");

    return FormatResponse(rows, total);
  }
}

export const Service = new OrganizerService();