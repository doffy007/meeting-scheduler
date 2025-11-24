import jwt, { type SignOptions, type VerifyOptions } from "jsonwebtoken";
import jwtConfig from "./config.js";

export interface JWTPayload  {
  id: string;
  [key: string]: any;
}

export interface JWTService {
  sign(payload: JWTPayload, options?: SignOptions): string;
  verify<T = JWTPayload>(token: string, options?: VerifyOptions): Promise<T>;
  decode<T = JWTPayload>(token: string): T | null;
}

class JWTServiceImpl implements JWTService {
  private publicKey: Buffer;
  private privateKey: Buffer;
  private projectName: string;

  constructor() {
    this.publicKey = jwtConfig.jwtSecretPublic;
    this.privateKey = jwtConfig.jwtSecretPrivate;
    this.projectName = jwtConfig.projectName;

    console.log("JWT service initialized");
  }

    sign(payload: JWTPayload, options?: SignOptions): string {
    const defaultOptions: SignOptions = {
        algorithm: "RS256",
        issuer: this.projectName,
        expiresIn: "24h",
        ...options,
    };

    return jwt.sign(payload, this.privateKey, defaultOptions);
    }

  async verify<T = JWTPayload>(token: string, options?: VerifyOptions): Promise<T> {
    const defaultOptions: VerifyOptions = {
      algorithms: ["RS256"],
      issuer: this.projectName,
      ...options,
    };

    try {
      return jwt.verify(token, this.publicKey, defaultOptions) as T;
    } catch (err) {
      throw new Error(`JWT verification failed: ${(err as Error).message}`);
    }
  }

  decode<T = JWTPayload>(token: string): T | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as T;
    } catch (err) {
      console.error("JWT decode failed:", err);
      return null;
    }
  }
}

export const Service = new JWTServiceImpl();

export default Service;