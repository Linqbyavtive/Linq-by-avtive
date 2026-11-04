"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button as ShadButton } from "@/components/ui/button";
import { FileSpreadsheet, Users, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SpreadsheetImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  allRows?: Record<string, string>[];
  totalRows: number;
  eventId?: string;
  eventName?: string;
  onUseAsContent: (variables: string[]) => void;
  onRecipientsImported?: () => void;
}

export function SpreadsheetImportModal({
  open,
  onOpenChange,
  fileName,
  headers,
  sampleRows,
  allRows,
  totalRows,
  eventId,
  eventName,
  onUseAsContent,
  onRecipientsImported,
}: SpreadsheetImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"content" | "recipients">("content");

  const handleApplyContent = () => {
    onUseAsContent(headers);
    onOpenChange(false);
    toast.success("Spreadsheet variables added to editor");
  };

  const handleImportRecipients = async () => {
    if (!eventId) {
      toast.error("No campaign selected for recipient import");
      return;
    }

    setIsImporting(true);
    try {
      // Find matching column names for name, email, linkedin, company, role
      const nameCol = headers.find((h) => /name|full_?name|attendee/i.test(h)) || headers[0];
      const emailCol = headers.find((h) => /email|mail/i.test(h)) || headers[1];
      const linkedinCol = headers.find((h) => /linkedin|li|profile/i.test(h));
      const companyCol = headers.find((h) => /company|org|organization/i.test(h));
      const roleCol = headers.find((h) => /role|title|position/i.test(h));

      const rowsToImport = allRows && allRows.length > 0 ? allRows : sampleRows;
      const recipients = rowsToImport.map((row) => ({
        name: row[nameCol] || "",
        email: emailCol ? row[emailCol] : "",
        linkedin: linkedinCol ? row[linkedinCol] : "",
        company: companyCol ? row[companyCol] : "",
        role: roleCol ? row[roleCol] : "",
      }));

      const res = await fetch("/api/admin/promotions/import-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          recipients,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to import recipients");
        return;
      }

      toast.success(data.message || `Imported ${data.importedCount} new recipients`);
      onOpenChange(false);
      onRecipientsImported?.();
    } catch {
      toast.error("Network error during recipient import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-border/70 rounded-2xl p-6 shadow-xl">
        <DialogHeader className="flex flex-col gap-1.5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-primary">
            <FileSpreadsheet size={18} />
            <DialogTitle className="text-base font-semibold text-heading">
              Import Spreadsheet
            </DialogTitle>
          </div>
          <p className="text-xs text-muted">
            Found <span className="font-semibold text-heading">{totalRows} rows</span> and{" "}
            <span className="font-semibold text-heading">{headers.length} columns</span> in{" "}
            <span className="font-mono text-slate-600">{fileName}</span>.
          </p>
        </DialogHeader>

        {/* Action Choice */}
        <div className="flex flex-col gap-3 py-3">
          <div
            onClick={() => setSelectedAction("content")}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selectedAction === "content"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border/60 hover:border-border bg-slate-50/50"
            }`}
          >
            <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-border/50 text-primary">
              <FileText size={16} />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-xs font-semibold text-heading">Use as Template Content</h4>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">
                Extracts columns as template variables (e.g.{" "}
                {headers.slice(0, 3).map((h) => `{{${h}}}`).join(", ")}
                ) for editing.
              </p>
            </div>
          </div>

          <div
            onClick={() => setSelectedAction("recipients")}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selectedAction === "recipients"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border/60 hover:border-border bg-slate-50/50"
            }`}
          >
            <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-border/50 text-emerald-600">
              <Users size={16} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-heading">Import as Campaign Recipients</h4>
                <span className="text-[9px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                  Safe Merge
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">
                Adds recipients into {eventName ? <b>{eventName}</b> : "this campaign"}.
              </p>
            </div>
          </div>

          {selectedAction === "recipients" && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900 leading-snug">
              <AlertCircle size={14} className="shrink-0 text-amber-700" />
              <span>
                Existing campaign attendee data is strictly preserved and will <b>never</b> be overwritten.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
          <ShadButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 text-muted hover:text-heading cursor-pointer"
          >
            Cancel
          </ShadButton>

          {selectedAction === "content" ? (
            <ShadButton
              type="button"
              size="sm"
              onClick={handleApplyContent}
              className="text-xs h-8 font-semibold px-4 cursor-pointer"
            >
              Use in Editor
            </ShadButton>
          ) : (
            <ShadButton
              type="button"
              size="sm"
              disabled={isImporting}
              onClick={handleImportRecipients}
              className="text-xs h-8 font-semibold px-4 gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isImporting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Confirm Import
            </ShadButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
