import { SignJWT, jwtVerify } from "jose";
import { logger } from "@/lib/logger-server";

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
}

export interface LinkedInMemberInfo {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface LinkedInSessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  memberSub: string;
  memberName: string;
  memberEmail?: string;
  memberPicture?: string;
}

export interface LinkedInStatePayload {
  cardId: string;
  shareToken?: string;
  isPopup?: boolean;
  nonce: string;
  timestamp: number;
}

export const LINKEDIN_AUTH_COOKIE_NAME = "linq_li_auth";
export const LINKEDIN_STATE_COOKIE_NAME = "linq_li_state";
export const LINKEDIN_DEFAULT_API_VERSION = "202401";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.NEON_AUTH_COOKIE_SECRET ||
    process.env.SECURITY_HMAC_KEY ||
    "linq-linkedin-secure-encryption-secret-key-32";
  return new TextEncoder().encode(secret.padEnd(32, "!"));
}

export function getLinkedInOAuthConfig(origin?: string): LinkedInOAuthConfig {
  const clientId = String(process.env.LINKEDIN_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.LINKEDIN_CLIENT_SECRET || "").trim();
  let redirectUri = String(process.env.LINKEDIN_REDIRECT_URI || "").trim();
  const apiVersion = String(process.env.LINKEDIN_API_VERSION || LINKEDIN_DEFAULT_API_VERSION).trim();

  if (!redirectUri && origin) {
    redirectUri = `${origin.replace(/\/$/, "")}/api/share/linkedin/callback`;
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      "LinkedIn credentials not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your environment variables."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: redirectUri || "http://localhost:3000/api/share/linkedin/callback",
    apiVersion,
  };
}

export function isLinkedInConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() &&
    process.env.LINKEDIN_CLIENT_SECRET?.trim()
  );
}

/**
 * Creates an encrypted, tamper-proof state token for OAuth CSRF protection.
 */
export async function createLinkedInStateToken(payload: LinkedInStatePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecretKey());
}

/**
 * Verifies and decodes the OAuth state token.
 */
export async function verifyLinkedInStateToken(token: string): Promise<LinkedInStatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.cardId || !payload.nonce) return null;
    return {
      cardId: String(payload.cardId),
      shareToken: typeof payload.shareToken === "string" ? payload.shareToken : undefined,
      isPopup: Boolean(payload.isPopup),
      nonce: String(payload.nonce),
      timestamp: Number(payload.timestamp || 0),
    };
  } catch (err) {
    logger.warn({ err }, "LinkedIn state token verification failed");
    return null;
  }
}

/**
 * Encrypts and signs the LinkedIn session data for the HttpOnly cookie.
 */
export async function sealLinkedInSession(data: LinkedInSessionData): Promise<string> {
  return new SignJWT({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || "",
    expiresAt: data.expiresAt,
    memberSub: data.memberSub,
    memberName: data.memberName,
    memberEmail: data.memberEmail || "",
    memberPicture: data.memberPicture || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(data.expiresAt))
    .sign(getSecretKey());
}

/**
 * Decrypts and validates the LinkedIn session from the HttpOnly cookie.
 */
export async function unsealLinkedInSession(sealed: string): Promise<LinkedInSessionData | null> {
  try {
    const { payload } = await jwtVerify(sealed, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.accessToken || !payload.memberSub) return null;
    const expiresAt = Number(payload.expiresAt || 0);
    if (expiresAt > 0 && Date.now() > expiresAt) {
      return null;
    }
    return {
      accessToken: String(payload.accessToken),
      refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : undefined,
      expiresAt,
      memberSub: String(payload.memberSub),
      memberName: String(payload.memberName || "LinkedIn Member"),
      memberEmail: typeof payload.memberEmail === "string" ? payload.memberEmail : undefined,
      memberPicture: typeof payload.memberPicture === "string" ? payload.memberPicture : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Generates the LinkedIn OAuth authorization URL.
 * Required member scopes: openid, profile, email, w_member_social.
 */
export function generateLinkedInAuthUrl(state: string, config: LinkedInOAuthConfig): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: "openid profile email w_member_social",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchanges the OAuth authorization code for an access token.
 */
export async function exchangeLinkedInAuthCode(
  code: string,
  config: LinkedInOAuthConfig
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok || !data.access_token) {
    const errorMsg =
      String(data.error_description || data.error || data.message || "Failed to exchange authorization code");
    logger.error({ status: res.status, error: data }, "LinkedIn token exchange error");
    throw new Error(errorMsg);
  }

  return {
    accessToken: String(data.access_token),
    expiresIn: Number(data.expires_in || 5184000), // Default ~60 days
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
  };
}

/**
 * Retrieves the LinkedIn member's profile via the OpenID Connect userinfo endpoint.
 */
export async function getLinkedInMemberInfo(accessToken: string): Promise<LinkedInMemberInfo> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok || !data.sub) {
    const msg = String(data.message || "Failed to retrieve LinkedIn member info");
    logger.error({ status: res.status, error: data }, "LinkedIn userinfo fetch failed");
    throw new Error(msg);
  }

  return {
    sub: String(data.sub),
    name: String(data.name || [data.given_name, data.family_name].filter(Boolean).join(" ") || "LinkedIn Member"),
    email: typeof data.email === "string" ? data.email : undefined,
    picture: typeof data.picture === "string" ? data.picture : undefined,
  };
}

/**
 * Common REST API headers for LinkedIn's versioned REST APIs.
 */
function getLinkedInRestHeaders(accessToken: string, apiVersion = LINKEDIN_DEFAULT_API_VERSION) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": apiVersion,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

/**
 * Initializes an image upload using LinkedIn's Images API.
 * POST https://api.linkedin.com/rest/images?action=initializeUpload
 */
export async function initializeLinkedInImageUpload(
  accessToken: string,
  memberSub: string,
  apiVersion = LINKEDIN_DEFAULT_API_VERSION
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const url = "https://api.linkedin.com/rest/images?action=initializeUpload";
  const body = {
    initializeUploadRequest: {
      owner: `urn:li:person:${memberSub}`,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getLinkedInRestHeaders(accessToken, apiVersion),
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    value?: {
      uploadUrl?: string;
      image?: string;
    };
    message?: string;
  };

  if (!res.ok || !data.value?.uploadUrl || !data.value?.image) {
    const errMsg = data.message || `LinkedIn image upload initialization failed (${res.status})`;
    logger.error({ status: res.status, response: data }, "LinkedIn Images API initialization error");
    throw new Error(errMsg);
  }

  return {
    uploadUrl: data.value.uploadUrl,
    imageUrn: data.value.image,
  };
}

/**
 * Uploads the image binary directly to LinkedIn's single-use upload URL.
 */
export async function uploadImageBinaryToLinkedIn(
  uploadUrl: string,
  imageBuffer: Buffer,
  contentType = "image/png"
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(imageBuffer.length),
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!res.ok && res.status !== 201) {
    const errorText = await res.text().catch(() => "");
    logger.error({ status: res.status, errorText }, "LinkedIn binary upload failed");
    throw new Error(`Failed to upload card image to LinkedIn (Status: ${res.status}).`);
  }
}

/**
 * Creates an image post on LinkedIn using the Posts API.
 * POST https://api.linkedin.com/rest/posts
 */
export async function createLinkedInImagePost(input: {
  accessToken: string;
  memberSub: string;
  imageUrn: string;
  commentary: string;
  title?: string;
  altText?: string;
  apiVersion?: string;
}): Promise<{ postUrn: string; postUrl: string }> {
  const {
    accessToken,
    memberSub,
    imageUrn,
    commentary,
    title = "Attendee Badge",
    altText = "Attendee card",
    apiVersion = LINKEDIN_DEFAULT_API_VERSION,
  } = input;

  const cleanMemberId = memberSub.replace(/^urn:li:person:/, "");
  const authorUrn = `urn:li:person:${cleanMemberId}`;

  const url = "https://api.linkedin.com/rest/posts";
  const body = {
    author: authorUrn,
    commentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        id: imageUrn,
        altText,
        title,
      },
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getLinkedInRestHeaders(accessToken, apiVersion),
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }

  // LinkedIn returns the created URN in header x-restli-id or response body `id`
  const postUrn =
    res.headers.get("x-restli-id") ||
    res.headers.get("x-linkedin-id") ||
    (typeof payload.id === "string" ? payload.id : "");

  if (!res.ok || (!postUrn && res.status !== 201)) {
    const errorMsg =
      String(payload.message || payload.error || `LinkedIn post creation failed with status ${res.status}`);
    logger.error(
      { status: res.status, headers: Object.fromEntries(res.headers.entries()), payload },
      "LinkedIn post creation error"
    );
    throw new Error(errorMsg);
  }

  const effectiveUrn = postUrn || `urn:li:share:${Date.now()}`;
  const postUrl = `https://www.linkedin.com/feed/update/${effectiveUrn}`;

  return {
    postUrn: effectiveUrn,
    postUrl,
  };
}
