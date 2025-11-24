import { Service as DBService } from "../db";
import type { Params } from "../filter/param.js";
import type { OrganizerSettings } from "../setting/setting.js";
import { Service as UIDService } from "../uid";
import  type { Organizer } from "./organizer.js";
import { composeDbQueryFromFilters } from "../filter/filter";
import { composeSorts } from "../filter/sort";

export interface IOrganizerService {
    createOrganizer(req: Organizer): Promise<Organizer>;
    updateOrganizer(req: Organizer, updatedFields: string[], userId: string): Promise<Organizer>;
    getOrganizer(id: string): Promise<Organizer | null>;
    getOrganizerByUserId(userId: string): Promise<Organizer | null>;  
    listOrganizer(params: Params): Promise<Organizer[]>;
}   

class OrganizerService implements IOrganizerService {
    private db: typeof DBService;
    constructor() {
        this.db = DBService; 
    }

  async createOrganizer(req: Organizer): Promise<Organizer> {
    const id = UIDService.generate();
    const now = new Date();

    const query = `
        INSERT INTO organizer (id, user_id, name, email, phone, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, user_id, name, email, phone, address, created_at, updated_at, deleted_at
    `;

    const row = await DBService.queryRow<Organizer>(query,
        id,
        req.user_id,
        req.name,
        req.email,
        req.phone,
        req.address,
        now,
        now
    );

    if (!row) {
        throw new Error("Failed to create organizer");
    }

    return row;
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

  async listOrganizer(params: Params): Promise<Organizer[]> {
    const args: any[] = [];
    let sql = `
      SELECT 
        a.id as organizer_id,
        a.user_id ,
        a.name ,
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
    `;

    const filterQuery = composeDbQueryFromFilters(params.filters, args);
    sql += " " + filterQuery.sql;

    if (params.search) {
      args.push(`%${params.search}%`);
      sql += (filterQuery.sql ? " AND " : " WHERE ") + `a.name ILIKE $${args.length}`;
    }

    if (params.sorts?.length) {
      const sortSql = composeSorts(params.sorts); 
      sql += ` ${sortSql}`;
    }

    const limit = params.page?.limit ?? 20;
    const offset = params.page?.offset ?? 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const rows = await DBService.query(sql, ...args);
    return rows.map(r => ({
      id: r.organizer_id,         
      deleted_at: r.deleted_at ?? null, 
      user_id: r.user_id,
      name: r.organizer_name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      created_at: r.created_at,
      updated_at: r.updated_at,
      meeting_duration_minutes: r.meeting_duration_minutes,
      buffer_before_minutes: r.buffer_before_minutes,
      buffer_after_minutes: r.buffer_after_minutes,
      minimum_notice_hours: r.minimum_notice_hours,
      working_hours: r.working_hours,
      timezone: r.timezone,
      blackout_dates: r.blackout_dates
    }));
  }
}

export const Service = new OrganizerService();