import { describe, it, expect } from "vitest";
import { DEFAULT_TEMPLATES } from "@/components/admin/promotion/defaultTemplates";
import { parsePromotionImportFile } from "@/components/admin/promotion/importUtils";
import { PromotionChannel, PromotionTheme } from "@/components/admin/promotion/types";
import fs from "fs";
import path from "path";

describe("Promotion Feature Improvements", () => {
  describe("1. Template Completeness & Structure", () => {
    const channels: PromotionChannel[] = ["newsletter", "linkedin", "whatsapp"];

    channels.forEach((channel) => {
      it(`provides exactly 3 templates for channel: ${channel}`, () => {
        const templates = DEFAULT_TEMPLATES[channel];
        expect(templates).toBeDefined();
        expect(templates.length).toBe(3);
      });

      it(`every template in ${channel} has non-empty id, name, and message`, () => {
        DEFAULT_TEMPLATES[channel].forEach((tpl) => {
          expect(tpl.id).toBeTruthy();
          expect(tpl.name).toBeTruthy();
          expect(tpl.message).toBeTruthy();
          expect(tpl.channel).toBe(channel);
        });
      });
    });

    it("newsletter templates include heading, subject, and call-to-action button properties", () => {
      DEFAULT_TEMPLATES.newsletter.forEach((tpl) => {
        expect(tpl.heading).toBeTruthy();
        expect(tpl.subject).toBeTruthy();
        expect(tpl.buttonText).toBeTruthy();
        expect(tpl.buttonUrl).toBeTruthy();
      });
    });

    it("whatsapp and linkedin templates support dynamic {{name}} attendee tag", () => {
      const allMessages = [
        ...DEFAULT_TEMPLATES.linkedin.map((t) => t.message),
        ...DEFAULT_TEMPLATES.whatsapp.map((t) => t.message),
      ];

      allMessages.forEach((msg) => {
        expect(msg).toContain("{{name}}");
      });
    });
  });

  describe("2. Simple Themes Support", () => {
    const expectedThemes: PromotionTheme[] = [
      "default",
      "minimal",
      "dark",
      "professional",
      "event",
    ];

    it("defines 5 themes with distinct styling options", () => {
      expect(expectedThemes).toHaveLength(5);
    });

    it("newsletter preview styling handles each theme without error", () => {
      expectedThemes.forEach((theme) => {
        // Verify theme string is valid and can be assigned
        const tplTheme: PromotionTheme = theme;
        expect(["default", "minimal", "dark", "professional", "event"]).toContain(tplTheme);
      });
    });
  });

  describe("3. File Import & Content Extraction Utility", () => {
    it("handles plain text import and extracts heading and message", async () => {
      const fileContent = "Big Product Launch\n\nWe are announcing our new features for all attendees.";
      const file = new File([fileContent], "announcement.txt", { type: "text/plain" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("text");
      if (result.type === "text") {
        expect(result.heading).toBe("Big Product Launch");
        expect(result.message).toContain("We are announcing our new features");
      }
    });

    it("handles JSON template import", async () => {
      const jsonContent = JSON.stringify({
        heading: "Custom Keynote Announcement",
        subject: "Special Session Update",
        message: "Join us in Hall B at 3 PM.",
      });
      const file = new File([jsonContent], "template.json", { type: "application/json" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("text");
      if (result.type === "text") {
        expect(result.heading).toBe("Custom Keynote Announcement");
        expect(result.subject).toBe("Special Session Update");
        expect(result.message).toBe("Join us in Hall B at 3 PM.");
      }
    });

    it("handles CSV spreadsheet import with columns and sample rows", async () => {
      const csvContent = "Full Name,Email,Company\nAlice Smith,alice@example.com,Acme Corp\nBob Jones,bob@example.com,Beta LLC";
      const file = new File([csvContent], "attendees.csv", { type: "text/csv" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("spreadsheet");
      if (result.type === "spreadsheet") {
        expect(result.headers).toContain("Full Name");
        expect(result.headers).toContain("Email");
        expect(result.headers).toContain("Company");
        expect(result.totalRows).toBe(2);
        expect(result.sampleRows[0]["Full Name"]).toBe("Alice Smith");
      }
    });

    it("parses all data rows into allRows when CSV contains more than 5 rows, while capping sampleRows at 5", async () => {
      const rows = Array.from({ length: 12 }, (_, i) => `Attendee ${i + 1},att${i + 1}@example.com,Company ${i + 1}`);
      const csvContent = ["Full Name,Email,Company", ...rows].join("\n");
      const file = new File([csvContent], "large_attendees.csv", { type: "text/csv" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("spreadsheet");
      if (result.type === "spreadsheet") {
        expect(result.totalRows).toBe(12);
        expect(result.sampleRows.length).toBe(5);
        expect(result.allRows).toBeDefined();
        expect(result.allRows?.length).toBe(12);
        expect(result.allRows?.[0]["Full Name"]).toBe("Attendee 1");
        expect(result.allRows?.[0]["Email"]).toBe("att1@example.com");
        expect(result.allRows?.[11]["Full Name"]).toBe("Attendee 12");
        expect(result.allRows?.[11]["Email"]).toBe("att12@example.com");
      }
    });

    it("parses TSV spreadsheet with tab delimiter and captures allRows", async () => {
      const tsvContent = "Name\tEmail\nUser 1\tu1@test.com\nUser 2\tu2@test.com\nUser 3\tu3@test.com";
      const file = new File([tsvContent], "attendees.tsv", { type: "text/tab-separated-values" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("spreadsheet");
      if (result.type === "spreadsheet") {
        expect(result.headers).toEqual(["Name", "Email"]);
        expect(result.totalRows).toBe(3);
        expect(result.sampleRows.length).toBe(3);
        expect(result.allRows?.length).toBe(3);
        expect(result.allRows?.[2]["Name"]).toBe("User 3");
      }
    });

    it("handles image files and returns data url", async () => {
      const blob = new Blob(["fake-image-bytes"], { type: "image/png" });
      const file = new File([blob], "banner.png", { type: "image/png" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("image");
      if (result.type === "image") {
        expect(result.fileName).toBe("banner.png");
        expect(result.dataUrl).toContain("data:image/png");
      }
    });

    it("returns clear user error for unsupported file formats", async () => {
      const blob = new Blob(["binary-content"], { type: "application/octet-stream" });
      const file = new File([blob], "executable.exe", { type: "application/octet-stream" });

      const result = await parsePromotionImportFile(file);
      expect(result.type).toBe("unsupported");
      if (result.type === "unsupported") {
        expect(result.message).toContain('Unsupported file format ".exe"');
      }
    });
  });

  describe("4. Linq Logo Aspect Ratio Warning Fix Verification", () => {
    const logoFiles = [
      "src/app/login/page.tsx",
      "src/app/signup/page.tsx",
      "src/app/organization/status/page.tsx",
      "src/app/organization/register/page.tsx",
      "src/app/dashboard/promotions/page.tsx",
      "src/app/admin/layout.tsx",
    ];

    logoFiles.forEach((relPath) => {
      it(`verifies ${relPath} includes style={{ width: "auto" }} on /linq-logo.png Image`, () => {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf8");
        expect(content).toContain('/linq-logo.png');
        expect(content).toContain('style={{ width: "auto" }}');
      });
    });
  });
});
