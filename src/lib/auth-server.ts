import { getServerAuthSession } from "@/auth";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export async function getServerUserIdFromCookies(
  cookieStore?: ReadonlyRequestCookies,
  preResolvedSession?: Awaited<ReturnType<typeof getServerAuthSession>>
): Promise<string | null> {
  void cookieStore;
  const session = preResolvedSession !== undefined ? preResolvedSession : await getServerAuthSession();
  const userId = String(session?.user?.id || "").trim();
  return userId || null;
}
