import { randomBytes, timingSafeEqual } from "crypto";
import argon2 from "argon2";

const DEFAULT_MEMORY = 128 * 1024; 
const DEFAULT_ITERATIONS = 4;
const DEFAULT_PARALLELISM = 4;
const DEFAULT_KEY_LENGTH = 32;
const DEFAULT_SALT_LENGTH = 16;

export interface HashOptions {
  memory?: number;
  iterations?: number;
  parallelism?: number;
  keyLength?: number;
  saltLength?: number;
}

/**
 * Generate random salt
 */
export function generateSalt(length: number = DEFAULT_SALT_LENGTH): Buffer {
  return randomBytes(length);
}

/**
 * Hash password using Argon2id
 */
export async function hashPassword(
  password: string,
  options?: HashOptions
): Promise<string> {
  const memory = options?.memory ?? DEFAULT_MEMORY;
  const iterations = options?.iterations ?? DEFAULT_ITERATIONS;
  const parallelism = options?.parallelism ?? DEFAULT_PARALLELISM;
  const keyLength = options?.keyLength ?? DEFAULT_KEY_LENGTH;
  const saltLength = options?.saltLength ?? DEFAULT_SALT_LENGTH;

  try {
    const salt = generateSalt(saltLength);

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: memory,
      timeCost: iterations,
      parallelism: parallelism,
      hashLength: keyLength,
      salt: salt,
      raw: true, 
    });

    const encoded = `ARGON2ID$${iterations}$${memory}$${parallelism}$${salt.toString(
      "base64url"
    )}$${Buffer.from(hash).toString("base64url")}`;

    return encoded;
  } catch (err) {
    throw new Error(`Failed to hash password: ${(err as Error).message}`);
  }
}

/**
 * Verify password against hash
 */
export async function checkPassword(
  encodedHash: string,
  password: string
): Promise<boolean> {
  const parts = encodedHash.split("$");

  if (parts.length !== 6) {
    console.error("Invalid hash format");
    return false;
  }

  try {
    const iterations = parseInt(parts[1]!, 10);
    const memory = parseInt(parts[2]!, 10);
    const parallelism = parseInt(parts[3]!, 10);

    const salt = Buffer.from(parts[4]!, "base64url");
    const hash = Buffer.from(parts[5]!, "base64url");

    const testHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: memory,
      timeCost: iterations,
      parallelism: parallelism,
      hashLength: hash.length,
      salt: salt,
      raw: true,
    });

    // Use timing-safe comparison
    return timingSafeEqual(hash, Buffer.from(testHash));
  } catch (err) {
    console.error("Password verification failed:", err);
    return false;
  }
}

/**
 * Parse encoded hash to get parameters
 */
export function parseHash(encodedHash: string): {
  iterations: number;
  memory: number;
  parallelism: number;
  salt: Buffer;
  hash: Buffer;
} | null {
  const parts = encodedHash.split("$");

  if (parts.length !== 6) {
    return null;
  }

  try {
    return {
      iterations: parseInt(parts[1]!, 10),
      memory: parseInt(parts[2]!, 10),
      parallelism: parseInt(parts[3]!, 10),
      salt: Buffer.from(parts[4]!, "base64url"),
      hash: Buffer.from(parts[5]!, "base64url"),
    };
  } catch (err) {
    return null;
  }
}