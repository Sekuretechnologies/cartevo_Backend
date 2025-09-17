import env from "@/env";
import { JwtService } from "@nestjs/jwt";
import * as jwt from "jsonwebtoken";

const jwtService = new JwtService();

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
