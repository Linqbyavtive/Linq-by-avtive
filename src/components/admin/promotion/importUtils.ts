import JSZip from "jszip";

export type ImportResult =
  | {
      type: "image";
      dataUrl: string;
      fileName: string;
    }
  | {
      type: "text";
      heading?: string;
      subject?: string;
      message: string;
      fileName: string;
    }
  | {
      type: "attachment";
      dataUrl: string;
      fileName: string;
      fileSize: string;
      fallbackReason?: string;
    }
  | {
      type: "spreadsheet";
      headers: string[];
      sampleRows: Record<string, string>[];
      allRows?: Record<string, string>[];
      totalRows: number;
      fileName: string;
    }
  | {
      type: "unsupported";
      message: string;
    };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      reject(new Error("FileReader not supported in this environment"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readFileAsDataUrl(file: File): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // Universal fallback (e.g. Node.js vitest environment)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

/**
 * Parses any supported promotion import file into editable content,
 * image, spreadsheet recipient data, or attachment.
 */
export async function parsePromotionImportFile(file: File): Promise<ImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type.toLowerCase();

  // 1. IMAGES (PNG, JPG, JPEG, WEBP)
  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
  ) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      return {
        type: "image",
        dataUrl,
        fileName: file.name,
      };
    } catch {
      return {
        type: "unsupported",
        message: `Failed to read image file "${file.name}".`,
      };
    }
  }

  // 2. PLAIN TEXT, MARKDOWN, JSON, HTML (Excluding spreadsheets)
  if (
    (["txt", "md", "json", "html"].includes(extension) || mimeType.startsWith("text/")) &&
    !["csv", "tsv"].includes(extension) &&
    mimeType !== "text/csv"
  ) {
    try {
      const raw = await readFileAsText(file);

      // Check if JSON template export
      if (extension === "json" || raw.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(raw);
          return {
            type: "text",
            heading: parsed.heading || parsed.name || "",
            subject: parsed.subject || "",
            message: parsed.message || raw,
            fileName: file.name,
          };
        } catch {
          // Fallback to text parsing
        }
      }

      // Plain text parsing: first non-empty line as heading, rest as message
      const lines = raw
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const heading = lines[0] && lines[0].length <= 120 ? lines[0] : "";
      const message = heading ? lines.slice(1).join("\n\n") : raw;

      return {
        type: "text",
        heading: heading || file.name.replace(/\.[^/.]+$/, ""),
        subject: heading || file.name.replace(/\.[^/.]+$/, ""),
        message: message || raw,
        fileName: file.name,
      };
    } catch {
      return {
        type: "unsupported",
        message: `Could not parse text in "${file.name}".`,
      };
    }
  }

  // 3. WORD DOCUMENTS (.docx)
  if (extension === "docx") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file("word/document.xml")?.async("text");

      if (documentXml) {
        // Extract text from <w:t> tags
        const textMatches = documentXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (textMatches && textMatches.length > 0) {
          const fullText = textMatches
            .map((m) => m.replace(/<w:t[^>]*>|<\/w:t>/g, "").trim())
            .filter(Boolean)
            .join(" ");

          if (fullText.length > 0) {
            const heading = fullText.length <= 120 ? fullText : fullText.slice(0, 100);
            return {
              type: "text",
              heading: file.name.replace(/\.[^/.]+$/, ""),
              subject: heading,
              message: fullText,
              fileName: file.name,
            };
          }
        }
      }
    } catch {
      // Fall through to attachment fallback
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      type: "attachment",
      dataUrl,
      fileName: file.name,
      fileSize: formatBytes(file.size),
      fallbackReason: "Attached document directly.",
    };
  }

  // 4. PDF DOCUMENTS (.pdf)
  if (extension === "pdf") {
    try {
      const text = await extractTextFromPdf(file);
      if (text && text.trim().length > 30) {
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const heading = lines[0] && lines[0].length <= 120 ? lines[0] : "";
        const message = heading ? lines.slice(1).join("\n\n") : text;

        return {
          type: "text",
          heading: heading || file.name.replace(/\.[^/.]+$/, ""),
          subject: heading || file.name.replace(/\.[^/.]+$/, ""),
          message: message || text,
          fileName: file.name,
        };
      }
    } catch {
      // Fall through to attachment
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      type: "attachment",
      dataUrl,
      fileName: file.name,
      fileSize: formatBytes(file.size),
      fallbackReason: "PDF added as attachment.",
    };
  }

  // 5. SPREADSHEETS (CSV, TSV, XLSX)
  if (["csv", "tsv"].includes(extension)) {
    try {
      const raw = await readFileAsText(file);
      const delimiter = extension === "tsv" ? "\t" : ",";
      const lines = raw
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((l) => l.trim().length > 0);

      if (lines.length === 0) {
        return {
          type: "unsupported",
          message: `Spreadsheet "${file.name}" is empty.`,
        };
      }

      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.replace(/^["']|["']$/g, "").trim());

      const sampleRows: Record<string, string>[] = [];
      const allRows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h || `Col_${idx + 1}`] = cols[idx] || "";
        });
        if (sampleRows.length < 5) {
          sampleRows.push(rowObj);
        }
        allRows.push(rowObj);
      }

      return {
        type: "spreadsheet",
        headers,
        sampleRows,
        allRows,
        totalRows: lines.length - 1,
        fileName: file.name,
      };
    } catch {
      return {
        type: "unsupported",
        message: `Could not parse spreadsheet "${file.name}".`,
      };
    }
  }

  if (["xlsx", "xls"].includes(extension)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("text");

      if (sharedStringsXml) {
        const matches = sharedStringsXml.match(/<t[^>]*>(.*?)<\/t>/g);
        if (matches && matches.length > 0) {
          const strings = matches.map((m) => m.replace(/<t[^>]*>|<\/t>/g, "").trim()).filter(Boolean);
          if (strings.length > 0) {
            const headers = strings.slice(0, Math.min(strings.length, 8));
            return {
              type: "spreadsheet",
              headers,
              sampleRows: [{ [headers[0]]: strings[headers.length] || "" }],
              totalRows: Math.max(strings.length - headers.length, 1),
              fileName: file.name,
            };
          }
        }
      }
    } catch {
      // Fall through to attachment
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      type: "attachment",
      dataUrl,
      fileName: file.name,
      fileSize: formatBytes(file.size),
    };
  }

  // 6. LEGACY DOC / COMMON DOCUMENTS
  if (["doc", "odt", "rtf"].includes(extension)) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      type: "attachment",
      dataUrl,
      fileName: file.name,
      fileSize: formatBytes(file.size),
      fallbackReason: "Document attached.",
    };
  }

  // 7. UNSUPPORTED FORMATS
  return {
    type: "unsupported",
    message: `Unsupported file format ".${extension}". Supported formats include PNG, JPG, WEBP, PDF, DOCX, TXT, CSV, and XLSX.`,
  };
}

/**
 * Extracts visible text strings from an unencrypted PDF file.
 */
async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const textDecoder = new TextDecoder("latin1");
  const rawString = textDecoder.decode(buffer);

  // Match text within PDF parentheses e.g. (Hello World) Tj or TJ
  const matches = rawString.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g);
  if (matches && matches.length > 0) {
    const words = matches
      .map((m) => m.replace(/^\(|\)\s*(?:Tj|'|")$/g, ""))
      .map((w) => w.replace(/\\([()\\])/g, "$1").trim())
      .filter((w) => w.length > 1 && !/^[\x00-\x1F]+$/.test(w));

    return words.join(" ");
  }

  return "";
}
