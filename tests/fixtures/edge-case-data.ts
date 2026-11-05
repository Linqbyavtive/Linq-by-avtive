/** Reusable malformed / boundary payloads for edge-case tests. */

export const EMPTY_STRING = "";
export const WHITESPACE_STRING = "   \t\n  ";
export const VERY_LONG_STRING = "a".repeat(10_000);
export const UNICODE_STRING = "测试用户 ñoël 日本語";
export const EMOJI_STRING = "👋🎉🔥";

export const INVALID_UUIDS = [
  "",
  "not-a-uuid",
  "123",
  "00000000-0000-0000-0000-000000000000",
  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "'; DROP TABLE events; --",
  "../../../etc/passwd",
  "a".repeat(64),
] as const;

export const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1; SELECT pg_sleep(10)--",
  "admin'--",
  "1 UNION SELECT null, null--",
] as const;

export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  "<img src=x onerror=alert(1)>",
  '"><svg/onload=alert(1)>',
  "javascript:alert(1)",
] as const;

export const OVERSIZED_JSON_OBJECT = {
  name: "x".repeat(5_000),
  description: "y".repeat(5_000),
  note: "z".repeat(5_000),
};

export const MALFORMED_OBJECTS = {
  nullBody: null,
  arrayBody: [1, 2, 3],
  stringBody: "not-json-object",
  numberBody: 42,
  emptyObject: {},
  missingRequiredRegister: { email: "a@b.com" },
  negativePagination: { limit: -1, offset: -5 },
  hugePagination: { limit: 999_999, offset: 999_999 },
} as const;

export const BOUNDARY_NUMBERS = {
  zero: 0,
  negative: -1,
  maxSafe: Number.MAX_SAFE_INTEGER,
  float: 3.14159,
} as const;

export const ATTENDEE_MALFORMED_PAYLOADS = [
  { name: "", role: "Engineer", company: "Acme" },
  { name: "John", role: "", company: "Acme" },
  { name: "John", role: "Engineer", company: "" },
  { name: SQL_INJECTION_PAYLOADS[0], role: "Engineer", company: "Acme" },
  { name: XSS_PAYLOADS[0], role: "Engineer", company: "Acme" },
  { name: "http://evil.com", role: "Engineer", company: "Acme" },
  { name: "A".repeat(100), role: "Engineer", company: "Acme" },
  { name: EMOJI_STRING, role: "Engineer", company: "Acme" },
] as const;

export const REGISTER_EDGE_CASES = {
  emptyEmail: { email: "", password: "SecurePass123!", username: "valid_user", organizationName: "Org" },
  invalidEmail: { email: "not-email", password: "SecurePass123!", username: "valid_user", organizationName: "Org" },
  shortPassword: { email: "a@example.com", password: "short", username: "valid_user", organizationName: "Org" },
  shortUsername: { email: "a@example.com", password: "SecurePass123!", username: "ab", organizationName: "Org" },
  invalidUsername: { email: "a@example.com", password: "SecurePass123!", username: "bad user!", organizationName: "Org" },
  emptyOrg: { email: "a@example.com", password: "SecurePass123!", username: "valid_user", organizationName: "" },
  sqlInEmail: { email: SQL_INJECTION_PAYLOADS[0], password: "SecurePass123!", username: "valid_user", organizationName: "Org" },
  xssOrg: { email: "a@example.com", password: "SecurePass123!", username: "valid_user", organizationName: XSS_PAYLOADS[0] },
} as const;
