import { hashPassword as argonHash, checkPassword as argonCheck } from "../util";
import { permutateStrings } from "../util";
import userConfig from "./config";

export interface User {
  id: string;
  name: string | null;
  username: string ;
  password: string;
  email: string | null;
  email_verified: boolean | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
  deactivated_at: Date | null;
  deleted_at: Date | null;
  last_seen: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  role: string | null;
  gender: string | null;
  country_code: string | null;
  phone_number: string | null;
  location: string | null;
  nationality: string | null;
  national_id_number: string | null;
  language: string | null;
  birthdate: Date | null;
}

// Regex for suspicious email detection
const suspiciousEmail = /^[a-z]+[0-9]+$/i;

// Errors
export class UserExistsError extends Error {
  constructor() {
    super("user already exists");
    this.name = "UserExistsError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("user not found");
    this.name = "UserNotFoundError";
  }
}

export class DeleteTokenError extends Error {
  constructor() {
    super("error delete token");
    this.name = "DeleteTokenError";
  }
}

export class InvalidPasswordError extends Error {
  constructor() {
    super("invalid password");
    this.name = "InvalidPasswordError";
  }
}

export class SuspiciousEmailError extends Error {
  constructor() {
    super("suspicious email address");
    this.name = "SuspiciousEmailError";
  }
}

/**
 * Remove sensitive PII from user object
 */
export function removeSensitivePII(user: User): User {
  return {
    ...user,
    email: null,
    gender: null,
    birthdate: null,
    password: "",
  };
}

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains digit
 * - No spaces
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }

  const hasSpace = /\s/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  return !hasSpace && hasUpperCase && hasDigit;
}

/**
 * Validate email for suspicious patterns
 */
export function validateEmail(user: User): void {
  if (!user.email) {
    return;
  }

  if (userConfig.suspiciousEmailDetectionEnable) {
    const parts = user.email.split("@");
    
    if (parts.length > 1 && user.name && suspiciousEmail.test(parts[0]!)) {
      const words = user.name
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      if (words.length > 0) {
        let matchCount = 0;

        permutateStrings(words, (permutation) => {
          const joined = permutation.join("");
          if (parts[0]!.startsWith(joined)) {
            matchCount++;
          }
        });

        if (matchCount > 0) {
          console.warn("Suspicious email detected for user:", user.id);
          throw new SuspiciousEmailError();
        }
      }
    }
  }
}

/**
 * Hash password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return argonHash(password);
}

/**
 * Compare hashed password with plain password
 */
export async function compareHashAndPassword(
  hashedPassword: string,
  password: string
): Promise<void> {
  const isValid = await argonCheck(hashedPassword, password);

  if (!isValid) {
    throw new InvalidPasswordError();
  }
}