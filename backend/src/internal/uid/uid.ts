import { randomUUID } from "node:crypto";

export interface UIDService {
  generate(): string;
}

class UIDServiceImpl implements UIDService {
  constructor() {
    console.log("UID service (UUID) initialized");
  }

  /**
   * Generate UUID v4
   * Output contoh: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
   */
  generate(): string {
    return randomUUID();
  }
}

export const Service = new UIDServiceImpl();

export default Service;