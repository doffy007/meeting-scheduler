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

export type TxFn<T = void> = (tx: postgres.Sql) => Promise<T>;

export interface DBService {
  query<T extends postgres.Row = postgres.Row>(
    q: string,
    ...args: any[]
  ): Promise<T[]>;
  queryRow<T extends postgres.Row = postgres.Row>(
    q: string,
    ...args: any[]
  ): Promise<T | null>;
  transaction<T = void>(tx: postgres.Sql | null, fn: TxFn<T>): Promise<T>;
  close(): Promise<void>;
  raw: postgres.Sql;
}

interface DBConfig {
  maxConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  maxLifetime: number;
  maxRetries: number;
  maxFailedPings: number;
  retryBackoffBase: number;
}

const DEFAULT_CONFIG: DBConfig = {
  maxConnections: 20,
  idleTimeout: 20,
  connectTimeout: 10,
  maxLifetime: 60 * 30,
  maxRetries: 3,
  maxFailedPings: 3,
  retryBackoffBase: 100,
};

class DBServiceImpl implements DBService {
  private sql: postgres.Sql;
  private pingInterval?: NodeJS.Timeout;
  private failedPings = 0;
  private readonly config: DBConfig;

  constructor(config: Partial<DBConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sql = this.initializeConnection();
    this.startHealthCheck();
    this.setupGracefulShutdown();
    console.log("Database service initialized");
  }

  async query<T extends postgres.Row = postgres.Row>(
    q: string,
    ...args: any[]
  ): Promise<T[]> {
    this.validateQuery(q);
    const result = await this.sql.unsafe(q, args);
    return result as unknown as T[];
  }

  async queryRow<T extends postgres.Row = postgres.Row>(
    q: string,
    ...args: any[]
  ): Promise<T | null> {
    this.validateQuery(q);
    const result = await this.sql.unsafe(q, args);
    if (!result || result.length === 0) {
      return null;
    }
    return result[0] as unknown as T;
  }

  async transaction<T = void>(
    tx: postgres.Sql | null,
    fn: TxFn<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (tx) {
          // Reuse existing transaction context
          const result = await fn(tx);
          return result;
        }

        // Create new transaction
        const result = await this.sql.begin(async (sql) => {
          return await fn(sql);
        });
        return result as T;
      } catch (err) {
        lastError = err as Error;
        const pgError = err as PostgresError;

        // Retry on deadlock
        if (
          pgError.code === DeadlockDetected &&
          attempt < this.config.maxRetries
        ) {
          this.logDeadlockRetry(attempt, pgError);
          await this.sleep(
            this.config.retryBackoffBase * Math.pow(2, attempt - 1)
          );
          continue;
        }

        // Log and rethrow for other errors
        this.logTransactionError(pgError);
        throw err;
      }
    }

    throw new Error(
      `Transaction failed after ${this.config.maxRetries} attempts: ${lastError?.message}`
    );
  }

  async close(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
    await this.sql.end();
    console.log("Database connection closed");
  }

  get raw(): postgres.Sql {
    return this.sql;
  }

  private initializeConnection(): postgres.Sql {
    const isDevelopment = process.env.NODE_ENV === "development";

    return postgres(dbConfig.DSN, {
      max: this.config.maxConnections,
      idle_timeout: this.config.idleTimeout,
      connect_timeout: this.config.connectTimeout,
      max_lifetime: this.config.maxLifetime,
      onnotice: () => {}, // Suppress PostgreSQL notices
      debug: isDevelopment
        ? (connection, query, parameters) => {
            console.log("DB Query:", { query, parameters });
          }
        : undefined,
    });
  }

  private validateQuery(query: string): void {
    if (query.includes("${")) {
      throw new Error(
        "Query contains template literal syntax. Use parameterized queries ($1, $2, etc.) for safety."
      );
    }
  }

  private logDeadlockRetry(attempt: number, error: PostgresError): void {
    console.warn(
      `[Transaction] Deadlock detected (attempt ${attempt}/${this.config.maxRetries})`,
      {
        table: error.table,
        detail: error.detail,
      }
    );
  }

  private logTransactionError(error: PostgresError): void {
    console.error("[Transaction] Failed:", {
      code: error.code,
      table: error.table,
      constraint: error.constraint,
      detail: error.detail,
    });
  }

  private startHealthCheck(): void {
    this.pingInterval = setInterval(async () => {
      try {
        await this.sql`SELECT 1`;
        this.failedPings = 0;
      } catch (err) {
        this.handleHealthCheckFailure(err);
      }
    }, dbConfig.pingInterval);
  }

  private handleHealthCheckFailure(err: unknown): void {
    this.failedPings++;
    console.error(
      `[HealthCheck] Database ping failed (${this.failedPings}/${this.config.maxFailedPings}):`,
      err
    );

    if (this.failedPings >= this.config.maxFailedPings) {
      console.error(
        "[HealthCheck] Max ping failures reached, terminating process"
      );
      this.shutdown();
    }
  }

  private setupGracefulShutdown(): void {
    const handleShutdown = async (signal: string) => {
      console.log(`[Shutdown] ${signal} received, closing database...`);
      await this.close();
      process.exit(0);
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  }

  private async shutdown(): Promise<void> {
    await this.close();
    process.exit(1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function order(asc: boolean): string {
  return asc ? OrderAsc : OrderDesc;
}

export function quoteString(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

export const Service = new DBServiceImpl();
export default Service;