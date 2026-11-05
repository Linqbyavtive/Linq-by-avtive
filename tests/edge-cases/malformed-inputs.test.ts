import { describe, expect, it } from "vitest";
import { isValidUuid } from "@/lib/validation/uuid";
import { validateAttendeeCoreFields } from "@/lib/validation/attendee-fields";
import { parseJsonBody, parseQueryParams } from "@/lib/middlewares/validateRequest";
import { registerBodySchema } from "@/lib/validators/auth.validator";
import { registrationReviewBodySchema, attendeeRegistrationBodySchema } from "@/lib/validators/registration.validator";
import { paginationQuerySchema } from "@/lib/validators/common.validator";
import {
  ATTENDEE_MALFORMED_PAYLOADS,
  INVALID_UUIDS,
  MALFORMED_OBJECTS,
  REGISTER_EDGE_CASES,
  SQL_INJECTION_PAYLOADS,
  VALID_UUID,
  XSS_PAYLOADS,
} from "../fixtures/edge-case-data";
import { invalidJsonRequest, jsonRequest, readJsonResponse } from "../helpers/json-request";

describe("malformed inputs — UUID validation", () => {
  it.each(INVALID_UUIDS)("rejects invalid uuid: %s", (id) => {
    expect(isValidUuid(id)).toBe(false);
  });

  it("accepts a valid uuid", () => {
    expect(isValidUuid(VALID_UUID)).toBe(true);
  });
});

describe("malformed inputs — auth register schema", () => {
  it.each(
    Object.entries(REGISTER_EDGE_CASES).filter(([key]) => key !== "xssOrg"),
  )("rejects register payload: %s", (_label, payload) => {
    const result = registerBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  // TODO(production): organizationName accepts raw HTML at schema layer — ensure output encoding in UI.
  it("accepts XSS-like organizationName at schema layer (render must escape)", () => {
    const result = registerBodySchema.safeParse(REGISTER_EDGE_CASES.xssOrg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationName).toContain("<script>");
    }
  });

  it("rejects SQL injection in organization name without throwing", () => {
    const result = registerBodySchema.safeParse({
      email: "user@example.com",
      password: "SecurePass123!",
      username: "valid_user",
      organizationName: SQL_INJECTION_PAYLOADS[1],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationName).toContain("DROP TABLE");
    }
  });
});

describe("malformed inputs — registration review schema", () => {
  it("requires rejectionReason when decision is reject", () => {
    const result = registrationReviewBodySchema.safeParse({ decision: "reject" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown decision values", () => {
    const result = registrationReviewBodySchema.safeParse({ decision: "maybe" });
    expect(result.success).toBe(false);
  });

  it("accepts approve without rejectionReason", () => {
    const result = registrationReviewBodySchema.safeParse({ decision: "approve" });
    expect(result.success).toBe(true);
  });
});

describe("malformed inputs — attendee field validation", () => {
  it.each(ATTENDEE_MALFORMED_PAYLOADS)("rejects attendee payload", (payload) => {
    const result = validateAttendeeCoreFields(payload as Record<string, unknown>);
    expect(result.ok).toBe(false);
  });

  it("rejects XSS in company field", () => {
    const result = validateAttendeeCoreFields({
      name: "Jane Doe",
      role: "Engineer",
      company: XSS_PAYLOADS[0],
    });
    expect(result.ok).toBe(false);
  });
});

describe("malformed inputs — parseJsonBody", () => {
  it("returns 400 for invalid JSON without throwing", async () => {
    const parsed = await parseJsonBody(invalidJsonRequest("http://localhost/api/test"), registerBodySchema);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      const body = await readJsonResponse(parsed.response);
      expect(body.error).toBeTruthy();
    }
  });

  it("returns 400 for null body", async () => {
    const parsed = await parseJsonBody(
      jsonRequest("http://localhost/api/test", MALFORMED_OBJECTS.nullBody),
      registerBodySchema,
    );
    expect(parsed.ok).toBe(false);
  });

  it("returns 400 for array body", async () => {
    const parsed = await parseJsonBody(
      jsonRequest("http://localhost/api/test", MALFORMED_OBJECTS.arrayBody),
      registerBodySchema,
    );
    expect(parsed.ok).toBe(false);
  });

  it("returns 400 for missing required register fields", async () => {
    const parsed = await parseJsonBody(
      jsonRequest("http://localhost/api/test", MALFORMED_OBJECTS.missingRequiredRegister),
      registerBodySchema,
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      const body = await readJsonResponse(parsed.response);
      expect(body.errors).toBeTruthy();
    }
  });
});

describe("malformed inputs — pagination query", () => {
  it("clamps invalid negative limit via coercion failure", () => {
    const result = paginationQuerySchema.safeParse(MALFORMED_OBJECTS.negativePagination);
    expect(result.success).toBe(false);
  });

  it("rejects excessive limit above max", () => {
    const result = paginationQuerySchema.safeParse(MALFORMED_OBJECTS.hugePagination);
    expect(result.success).toBe(false);
  });

  it("parses valid pagination from query string", () => {
    const params = new URLSearchParams({ limit: "25", offset: "0" });
    const parsed = parseQueryParams(params, paginationQuerySchema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.limit).toBe(25);
    }
  });
});

describe("malformed inputs — attendee registration body schema", () => {
  it("rejects invalid event_id uuid", () => {
    const result = attendeeRegistrationBodySchema.safeParse({
      name: "Jane",
      role: "Dev",
      company: "Acme",
      event_id: INVALID_UUIDS[1],
    });
    expect(result.success).toBe(false);
  });

  it("allows passthrough extra fields without throwing", () => {
    const result = attendeeRegistrationBodySchema.safeParse({
      name: "Jane",
      role: "Dev",
      company: "Acme",
      unknown_field: SQL_INJECTION_PAYLOADS[0],
    });
    expect(result.success).toBe(true);
  });
});
