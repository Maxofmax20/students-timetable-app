import { createHash, randomInt } from "node:crypto";

export function generateOtpCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  return hashOtpCode(code) === hash;
}

export function otpExpiresAt(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60_000);
}

export async function sendOtpEmail(email: string, code: string, purpose: string): Promise<{ delivered: boolean; channel: string }> {
  // Placeholder sender for now. Integrate SMTP provider later.
  console.log(`[OTP:${purpose}] email=${email} code=${code}`);
  return { delivered: true, channel: "console" };
}
