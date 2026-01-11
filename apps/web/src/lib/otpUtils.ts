import { createHash } from "crypto";

export function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function resolveEmailOtpSecret(): { secretString: string } {
  const raw = (process.env.JWT_SECRET || "").trim();
  if (raw) return { secretString: raw };
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing JWT_SECRET");
  }
  const fallback = "your-secret-key-change-in-production";
  return { secretString: fallback };
}

export function hashEmailOtpCode(code: string, secretString: string): string {
  return createHash("sha256").update(`${code}:${secretString}`, "utf8").digest("hex");
}
