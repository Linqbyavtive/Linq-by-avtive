import crypto from "node:crypto";
import { validateRequiredEnv } from "@/lib/env";

const isNextBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build" ||
  Boolean(process.env.CI);

if (!isNextBuild) {
  validateRequiredEnv([
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  ]);
}

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

function ensureCloudinaryEnv() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Missing Cloudinary credentials. Expected CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    );
  }
}

function getUploadEndpoint() {
  ensureCloudinaryEnv();
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
}

function getDestroyEndpoint() {
  ensureCloudinaryEnv();
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;
}

function signCloudinaryParams(params: Record<string, string>) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${CLOUDINARY_API_SECRET}`).digest("hex");
}

export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("/upload/")) return null;
  try {
    const parsed = new URL(url);
    const marker = "/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    const tail = parsed.pathname.slice(idx + marker.length);
    const withoutVersion = tail.replace(/^v\d+\//, "");
    const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");
    return withoutExt || null;
  } catch {
    return null;
  }
}

export async function uploadImageToCloudinary(input: {
  file: string;
  folder?: string;
  publicId?: string;
}): Promise<{ secureUrl: string; publicId: string }> {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signParams: Record<string, string> = {
    timestamp,
    folder: input.folder || "",
    overwrite: "true",
    invalidate: "true",
  };
  if (input.publicId) {
    signParams.public_id = input.publicId;
    signParams.unique_filename = "false";
  }
  const signature = signCloudinaryParams(signParams);

  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  if (input.folder) formData.append("folder", input.folder);
  if (input.publicId) formData.append("public_id", input.publicId);
  formData.append("overwrite", "true");
  formData.append("invalidate", "true");
  if (input.publicId) formData.append("unique_filename", "false");

  const response = await fetch(getUploadEndpoint(), {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }
  return { secureUrl: payload.secure_url, publicId: payload.public_id };
}

export async function deleteImageFromCloudinary(publicId: string): Promise<"ok" | "not found"> {
  if (!publicId) return "not found";
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signature = signCloudinaryParams({
    public_id: publicId,
    timestamp,
  });
  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  const response = await fetch(getDestroyEndpoint(), {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary delete failed.");
  }
  if (payload?.result !== "ok" && payload?.result !== "not found") {
    throw new Error("Cloudinary delete did not confirm removal.");
  }
  return payload.result;
}
