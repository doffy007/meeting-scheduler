import { z } from "zod";

// Validation schema
const UserConfigSchema = z.object({
  EMAIL_SUSPICIOUS_DETECTION: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .pipe(z.boolean())
    .default(false as any)
    .transform((val) => val === true),
});

type RawUserConfig = z.infer<typeof UserConfigSchema>;

export interface UserConfig {
  suspiciousEmailDetectionEnable: boolean;
}

function loadUserConfig(): UserConfig {
  // Parse and validate environment variables
  const raw = UserConfigSchema.parse({
    EMAIL_SUSPICIOUS_DETECTION: process.env.EMAIL_SUSPICIOUS_DETECTION || "false",
  });

  const config: UserConfig = {
    suspiciousEmailDetectionEnable: raw.EMAIL_SUSPICIOUS_DETECTION,
  };

  // Log config on startup
  console.log("User config loaded:", {
    suspiciousEmailDetectionEnable: config.suspiciousEmailDetectionEnable,
    timestamp: new Date().toISOString(),
  });

  return config;
}

// Load config as singleton
export const userConfig = loadUserConfig();

export default userConfig;