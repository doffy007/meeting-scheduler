import { z } from "zod";

const ConfigSchema = z.object({
  VERSION: z.string().default("v1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(8080),

  DSN: z.string().min(1, "Database DSN is required"),
  DATABASE_MAX_OPEN_CONNECTION: z.string().default("10"),
  DATABASE_MAX_IDLE_CONNECTION: z.string().default("5"),
  DATABASE_PING_INTERVAL: z.string().default("10"),

  CORS_URL: z.string().default("http://localhost:5173")
});

type RawConfig = z.infer<typeof ConfigSchema>;

export interface DatabaseConfig {
  DSN: string;
  DATABASE_MAX_OPEN_CONNECTION: string;
  DATABASE_MAX_IDLE_CONNECTION: string;
  DATABASE_PING_INTERVAL: string;
}

export interface Config {
  version: string;
  logLevel: string;
  port: number;
  database: DatabaseConfig;
  corsUrl: string;
}

function loadConfig(): Config {
  const raw = ConfigSchema.parse(process.env);
  const config: Config = {
    version: raw.VERSION,
    logLevel: raw.LOG_LEVEL,
    port: raw.PORT,
    database: {
      DSN: raw.DSN,
      DATABASE_MAX_OPEN_CONNECTION: raw.DATABASE_MAX_OPEN_CONNECTION,
      DATABASE_MAX_IDLE_CONNECTION: raw.DATABASE_MAX_IDLE_CONNECTION,
      DATABASE_PING_INTERVAL: raw.DATABASE_PING_INTERVAL,
    },
    corsUrl: raw.CORS_URL,
  };

  console.log("Config loaded:", {
    version: config.version,
    port: config.port,
    logLevel: config.logLevel,
    timestamp: new Date().toISOString(),
  });

  return config;
}

export default loadConfig;