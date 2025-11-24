import { z } from "zod";

// Validation schema
const DBConfigSchema = z.object({
  DSN: z.string().min(1, "Database DSN is required"),
  DB_PING_INTERVAL: z.string(),
});

type RawDBConfig = z.infer<typeof DBConfigSchema>;

export interface DBConfig {
  DSN: string;
  pingInterval: number;
}

// Helper to parse duration strings like "15m", "1h"
function parseDuration(duration: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = duration.match(regex);

  if (!match || match.length < 3) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like "15m", "1h", "30s"`
    );
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

function loadDBConfig(): DBConfig {
  const envVars = {
    DSN: process.env.DSN || "",
    DB_PING_INTERVAL: process.env.DB_PING_INTERVAL || "15m",
  };

  const raw = DBConfigSchema.parse(envVars);

  const config: DBConfig = {
    DSN: raw.DSN,
    pingInterval: parseDuration(raw.DB_PING_INTERVAL),
  };

  console.log("Database config loaded:", {
    DSN: config.DSN.replace(/:[^:@]+@/, ":****@"), 
    pingInterval: `${config.pingInterval}ms`,
    timestamp: new Date().toISOString(),
  });

  return config;
}

// Load config as singleton
export const dbConfig = loadDBConfig();

export default dbConfig;