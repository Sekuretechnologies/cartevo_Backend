import env from "@/env";
import { JwtService } from "@nestjs/jwt";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";

const jwtService = new JwtService();

// Encryption configuration
const ENCRYPTION_KEY = env.JWT_SECRET.substring(0, 32); // Use first 32 chars of JWT secret as encryption key
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encode a UTF-8 string into Base64.
 * Works in Node.js and browsers.
 * maplerad : bWFwbGVyYWQ=
 * miden : bWlkZW4=
 * sudo : c3Vkbw==
 */
export function encodeText(input: string): string {
  // Detect Node.js Buffer
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64");
  }
  // Fallback for browsers
  // First, UTF-8 → percent-encoding → binary string → Base64
  const utf8Bytes = encodeURIComponent(input).replace(
    /%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  return btoa(utf8Bytes);
}

/**
 * Decode a Base64 string back into UTF-8.
 * Works in Node.js and browsers.
 */
export function decodeText(base64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }
  // Browser: Base64 → binary string → percent-encoded → UTF-8
  const binary = atob(base64);
  const percentEncoded = Array.prototype.map
    .call(binary, (char: string) => {
      const code = char.charCodeAt(0).toString(16).toUpperCase();
      return "%" + (code.length < 2 ? "0" + code : code);
    })
    .join("");
  return decodeURIComponent(percentEncoded);
}

export const signToken = (id: any) => {
  const payload = { value: id };
  const token = jwtService.sign(payload, { secret: env.JWT_SECRET });
  return token;
};

export const decodeToken: any = (token: string) => {
  try {
    const decoded = jwtService.verify(token, { secret: env.JWT_SECRET }) as any;
    return decoded;
  } catch (err) {
    throw new Error("Invalid token");
  }
};

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param text - Plain text to encrypt
 * @returns Encrypted data as base64 string with IV
 */
export function encryptSensitiveData(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Combine IV and encrypted data
  const combined = Buffer.concat([iv, Buffer.from(encrypted, "hex")]);

  return combined.toString("base64");
}

/**
 * Decrypt sensitive data using AES-256-CBC
 * @param encryptedData - Encrypted data as base64 string
 * @returns Decrypted plain text
 */
export function decryptSensitiveData(encryptedData: string): string {
  try {
    const combined = Buffer.from(encryptedData, "base64");

    // Extract IV and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH);

    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);

    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data using bcrypt (for passwords)
 * @param data - Data to hash
 * @param rounds - Number of salt rounds (default: 12)
 * @returns Hashed data
 */
export async function hashSensitiveData(
  data: string,
  rounds: number = 12
): Promise<string> {
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(data, rounds);
}

/**
 * Verify hashed sensitive data
 * @param data - Plain data
 * @param hashedData - Hashed data to compare
 * @returns Boolean indicating if data matches
 */
export async function verifySensitiveData(
  data: string,
  hashedData: string
): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(data, hashedData);
}
