import postgres from "postgres";
import dbConfig from "./config.js";

export const OrderAsc = "ASC";
export const OrderDesc = "DESC NULLS LAST";

export const UniqueViolation = "23505";
export const DeadlockDetected = "40P01";

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

export type TxFn = (tx: postgres.Sql) => Promise<void>;

export interface DBService {
  query<T extends postgres.Row = postgres.Row>(q: string, ...args: any[]): Promise<T[]>;
  queryRow<T extends postgres.Row = postgres.Row>(q: string, ...args: any[]): Promise<T | null>;
  commit(tx: postgres.Sql | null, fn: TxFn): Promise<void>;
  begin(): Promise<postgres.Sql>;
  close(): Promise<void>;
  raw: postgres.Sql;
}

class DBServiceImpl implements DBService {
  private sql: postgres.Sql;
  private pingInterval?: NodeJS.Timeout;

  constructor() {
    this.sql = postgres(dbConfig.DSN, {
      max: 10,
      idle_timeout: 5,
      connect_timeout: 5,
      onnotice: () => {}, // Suppress notices
      debug: (connection, query, parameters) => {
        console.log("DB Query:", { query, parameters });
      },
    });

    // Start ping loop
    this.startPing();

    console.log("Database service initialized");
  }

async query<T extends postgres.Row = postgres.Row>(q: string, ...args: any[]): Promise<T[]> {
    const result = await this.sql.unsafe(q, args)
    return Array.from(result) as unknown as T[];
}

  async queryRow<T extends postgres.Row = postgres.Row>(q: string, ...args: any[]): Promise<T | null> {
    const result = await this.sql.unsafe(q, args);
    const rows = Array.from(result) as unknown as T[];
    return rows[0] ?? null;
  }

  async begin(): Promise<postgres.Sql> {
    // postgres library handles transactions differently
    // Return the sql instance itself for transaction
    return this.sql.begin(async (sql) => sql);
  }

  async commit(tx: postgres.Sql | null, fn: TxFn): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (tx) {
          // If tx is provided, just execute the function
          await fn(tx);
          return;
        }

        // Otherwise create new transaction
        await this.sql.begin(async (sql) => {
          await fn(sql);
        });

        return; // Success
      } catch (err) {
        lastError = err as Error;
        const pgError = err as PostgresError;

        // Detect deadlock and retry
        if (pgError.code === DeadlockDetected && attempt < maxRetries) {
          console.warn(
            `Deadlock detected, retrying transaction... (attempt ${attempt}/${maxRetries})`
          );
          // Exponential backoff
          await this.sleep(100 * Math.pow(2, attempt - 1));
          continue;
        }

        // Don't retry for other errors
        throw err;
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startPing() {
    this.pingInterval = setInterval(async () => {
      try {
        await this.sql`SELECT 1`;
      } catch (err) {
        console.error("Could not contact DB, terminating:", err);
        await this.close();
        process.exit(1);
      }
    }, dbConfig.pingInterval);
  }

  async close(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    await this.sql.end();
  }

  get raw(): postgres.Sql {
    return this.sql;
  }
}

// Helper functions
export function quoteString(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

export function order(asc: boolean): string {
  return asc ? OrderAsc : OrderDesc;
}

// Singleton instance
export const Service = new DBServiceImpl();

export default Service;