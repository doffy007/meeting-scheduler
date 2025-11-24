import { z } from "zod";
import { readFileSync } from "fs";
import { resolve } from "path";

const JWTConfigSchema = z.object({
  JWT_PUBLIC_KEY: z.string().default("../cred/public.pem"),
  JWT_PRIVATE_KEY: z.string().default("../cred/private.pem"),
  PROJECT_NAME: z.string().default("meeting-scheduler"),
});

type RawJWTConfig = z.infer<typeof JWTConfigSchema>;

export interface JWTConfig {
  jwtSecretPublicKeyPath: string;
  jwtSecretPrivateKeyPath: string;
  jwtSecretPublic: Buffer;
  jwtSecretPrivate: Buffer;
  projectName: string;
}

function loadJWTConfig(): JWTConfig {
  const raw = JWTConfigSchema.parse({
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    PROJECT_NAME: process.env.PROJECT_NAME,
  });

  const publicKeyPath = resolve(raw.JWT_PUBLIC_KEY);
  const privateKeyPath = resolve(raw.JWT_PRIVATE_KEY);

  // Read key files
  let jwtSecretPublic: Buffer;
  let jwtSecretPrivate: Buffer;

  try {
    jwtSecretPublic = readFileSync(publicKeyPath);
  } catch (err) {
    console.error("Error reading public key file:", err);
    throw new Error(`Failed to read public key from: ${publicKeyPath}`);
  }

  try {
    jwtSecretPrivate = readFileSync(privateKeyPath);
  } catch (err) {
    console.error("Error reading private key file:", err);
    throw new Error(`Failed to read private key from: ${privateKeyPath}`);
  }

  if (jwtSecretPublic.length === 0 || jwtSecretPrivate.length === 0) {
    throw new Error("JWT secret keys are not properly configured");
  }

  const config: JWTConfig = {
    jwtSecretPublicKeyPath: publicKeyPath,
    jwtSecretPrivateKeyPath: privateKeyPath,
    jwtSecretPublic,
    jwtSecretPrivate,
    projectName: raw.PROJECT_NAME,
  };

  console.log("JWT config loaded:", {
    publicKeyPath: config.jwtSecretPublicKeyPath,
    privateKeyPath: config.jwtSecretPrivateKeyPath,
    publicKeySize: config.jwtSecretPublic.length,
    privateKeySize: config.jwtSecretPrivate.length,
    projectName: config.projectName,
    timestamp: new Date().toISOString(),
  });

  return config;
}

export const jwtConfig = loadJWTConfig();

export default jwtConfig;