import crypto from "crypto";
import QRCode from "qrcode";

const ATTENDANCE_SECRET =
  process.env.ATTENDANCE_SECRET ||
  process.env.SECURITY_HMAC_KEY ||
  process.env.NEON_AUTH_SECRET ||
  "avtive-secure-attendance-qr-secret-key-2026";

export interface AttendanceQrPayload {
  attendeeId: string;
  eventId: string;
  code: string;
  signature: string;
}

export function computeAttendanceHmac(
  attendeeId: string,
  eventId: string,
  code: string,
): string {
  const data = `att:${attendeeId}|evt:${eventId}|code:${code}`;
  return crypto.createHmac("sha256", ATTENDANCE_SECRET).update(data).digest("hex");
}

export function generateAttendanceQrPayload(input: {
  attendeeId: string;
  eventId: string;
  code: string;
}): string {
  const signature = computeAttendanceHmac(input.attendeeId, input.eventId, input.code);
  const payload: AttendanceQrPayload = {
    attendeeId: input.attendeeId,
    eventId: input.eventId,
    code: input.code,
    signature,
  };
  return JSON.stringify(payload);
}

export function parseAndVerifyAttendanceQrPayload(rawPayload: string): {
  valid: boolean;
  payload?: AttendanceQrPayload;
  reason?: string;
} {
  const trimmed = String(rawPayload || "").trim();
  if (!trimmed) {
    return { valid: false, reason: "Empty payload." };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<AttendanceQrPayload>;
    if (!parsed.attendeeId || !parsed.eventId || !parsed.code || !parsed.signature) {
      return { valid: false, reason: "Invalid QR code format." };
    }

    const expectedSig = computeAttendanceHmac(
      parsed.attendeeId,
      parsed.eventId,
      parsed.code,
    );

    const sigBuffer = Buffer.from(parsed.signature, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false, reason: "Invalid QR code signature or forged payload." };
    }

    return {
      valid: true,
      payload: {
        attendeeId: parsed.attendeeId,
        eventId: parsed.eventId,
        code: parsed.code,
        signature: parsed.signature,
      },
    };
  } catch {
    return { valid: false, reason: "QR code contains unreadable data." };
  }
}

export async function generateAttendanceQrDataUrl(input: {
  attendeeId: string;
  eventId: string;
  code: string;
}): Promise<string> {
  const payload = generateAttendanceQrPayload(input);
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 280,
    color: {
      dark: "#1c1c1e",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}
