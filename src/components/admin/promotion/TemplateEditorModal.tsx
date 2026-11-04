"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button as ShadButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as ShadTextarea } from "@/components/ui/textarea";
import {
  X,
  Send as SendIcon,
  Save,
  Eye,
  Upload,
  FolderOpen,
  Trash2,
  RefreshCw,
  Paperclip,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { PromotionTemplate, ChannelEditorState, PromotionChannel, PromotionTheme } from "./types";
import { NewsletterLivePreview } from "./NewsletterLivePreview";
import { LinkedInLivePreview } from "./LinkedInLivePreview";
import { WhatsAppLivePreview } from "./WhatsAppLivePreview";
import { SendConfirmDialog } from "./SendConfirmDialog";
import { SpreadsheetImportModal } from "./SpreadsheetImportModal";
import { parsePromotionImportFile, ImportResult } from "./importUtils";

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PromotionTemplate | null;
  channel: PromotionChannel;
  eventId?: string;
  eventName?: string;
  onSendSuccess?: () => void;
}

const THEME_OPTIONS: { id: PromotionTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "#5B4DFB" },
  { id: "minimal", label: "Minimal", swatch: "#18181B" },
  { id: "dark", label: "Dark", swatch: "#0F172A" },
  { id: "professional", label: "Professional", swatch: "#1E40AF" },
  { id: "event", label: "Event", swatch: "#EA580C" },
];

function getModalInitialForm(
  template: PromotionTemplate | null,
  channel: PromotionChannel,
  eventId?: string,
): ChannelEditorState {
  if (!template) {
    return {
      subject: "",
      heading: "",
      message: "",
      imageUrl: "",
      buttonText: channel === "newsletter" ? "Open Attendee Card" : "",
      buttonUrl: "https://linq.avtive.com",
      attachmentUrl: "",
      attachmentName: "",
      caption: "",
      theme: "default",
    };
  }

  let initialData: ChannelEditorState = {
    subject: template.subject || "",
    heading: template.heading || "",
    message: template.message || "",
    imageUrl: template.imageUrl || "",
    buttonText: template.buttonText || (channel === "newsletter" ? "Open Attendee Card" : ""),
    buttonUrl: template.buttonUrl || "https://linq.avtive.com",
    attachmentUrl: template.attachmentUrl || "",
    attachmentName: template.attachmentName || "",
    caption: template.caption || "",
    theme: template.theme || "default",
  };

  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        `linq_tpl_draft_${eventId || "global"}_${template.id}`,
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        initialData = { ...initialData, ...parsed };
      }
    }
  } catch {}

  return initialData;
}

export function TemplateEditorModal({
  open,
  onOpenChange,
  template,
  channel,
  eventId,
  eventName,
  onSendSuccess,
}: TemplateEditorModalProps) {
  const [prevTemplateId, setPrevTemplateId] = useState(template?.id);
  const [form, setForm] = useState<ChannelEditorState>(() =>
    getModalInitialForm(template, channel, eventId),
  );

  if (template && template.id !== prevTemplateId) {
    setPrevTemplateId(template.id);
    setForm(getModalInitialForm(template, channel, eventId));
  }

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Spreadsheet modal state
  const [spreadsheetState, setSpreadsheetState] = useState<{
    open: boolean;
    fileName: string;
    headers: string[];
    sampleRows: Record<string, string>[];
    totalRows: number;
  }>({
    open: false,
    fileName: "",
    headers: [],
    sampleRows: [],
    totalRows: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    try {
      if (typeof window !== "undefined" && template) {
        localStorage.setItem(
          `linq_tpl_draft_${eventId || "global"}_${template.id}`,
          JSON.stringify(form),
        );
      }
      toast.success(eventName ? `Draft saved for ${eventName}` : "Draft saved");
    } catch {
      toast.error("Failed to save draft");
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }

    try {
      const result: ImportResult = await parsePromotionImportFile(file);

      if (result.type === "image") {
        setForm((prev) => ({ ...prev, imageUrl: result.dataUrl }));
        toast.success("Image imported into template");
      } else if (result.type === "text") {
        setForm((prev) => ({
          ...prev,
          heading: result.heading || prev.heading,
          subject: result.subject || prev.subject,
          message: result.message || prev.message,
        }));
        toast.success("Text extracted into editor");
      } else if (result.type === "attachment") {
        setForm((prev) => ({
          ...prev,
          attachmentUrl: result.dataUrl,
          attachmentName: result.fileName,
        }));
        toast.success(result.fallbackReason || "File added as attachment");
      } else if (result.type === "spreadsheet") {
        setSpreadsheetState({
          open: true,
          fileName: result.fileName,
          headers: result.headers,
          sampleRows: result.sampleRows,
          totalRows: result.totalRows,
        });
      } else if (result.type === "unsupported") {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to parse imported file");
    } finally {
      // Reset input value to allow re-uploading same file
      if (e.target) e.target.value = "";
    }
  };

  const executeSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/promotions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          templateId: template?.id,
          eventId,
          subject: form.subject,
          heading: form.heading,
          message: form.message,
          imageUrl: form.imageUrl,
          buttonText: form.buttonText,
          buttonUrl: form.buttonUrl,
          attachmentUrl: form.attachmentUrl,
          attachmentName: form.attachmentName,
          caption: form.caption,
          theme: form.theme,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send");
        return;
      }

      toast.success(data.message || `Sent to ${data.sentCount} attendees`);
      setIsConfirmOpen(false);
      onOpenChange(false);
      onSendSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending message";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handlePreviewClick = () => {
    setMobileTab("preview");
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const channelLabel =
    channel === "newsletter" ? "Newsletter" : channel === "linkedin" ? "LinkedIn" : "WhatsApp";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-5xl max-h-[92vh] bg-white border border-border/70 rounded-2xl p-0 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-3.5 border-b border-border/40 flex flex-row items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                {channelLabel}
              </span>
              <DialogTitle className="text-sm font-semibold text-heading flex items-center gap-2">
                <span>{template?.name || "Template Editor"}</span>
                {eventName && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {eventName}
                  </span>
                )}
              </DialogTitle>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden items-center gap-1 rounded-lg border border-border/60 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setMobileTab("edit")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  mobileTab === "edit"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:text-heading"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  mobileTab === "preview"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:text-heading"
                }`}
              >
                Preview
              </button>
            </div>

            <button
              onClick={() => onOpenChange(false)}
              className="text-muted hover:text-heading p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </DialogHeader>

          {/* Two-Column Editor Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
            {/* LEFT COLUMN: Editing Controls */}
            <div
              className={`lg:col-span-6 p-6 border-b lg:border-b-0 lg:border-r border-border/40 flex flex-col gap-4 overflow-y-auto ${
                mobileTab === "preview" ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Hidden Global File Input for Import/Browse */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.csv,.xlsx,.xls,.tsv,.json,.md"
                className="hidden"
                onChange={handleFileImport}
              />

              {/* Hidden Image-only upload input */}
              <input
                ref={attachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="hidden"
                onChange={handleFileImport}
              />

              {/* 1. SIMPLE THEME SELECTOR */}
              <div className="flex flex-col gap-1.5 pb-2 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-heading flex items-center gap-1.5">
                    <Palette size={13} className="text-primary" />
                    Theme
                  </Label>
                  <span className="text-[10px] text-muted">Applied to this template</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {THEME_OPTIONS.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, theme: th.id }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        form.theme === th.id
                          ? "border-primary bg-primary/10 text-primary shadow-2xs font-semibold ring-1 ring-primary/30"
                          : "border-border/60 bg-white text-muted hover:text-heading hover:border-border"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: th.swatch }}
                      />
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. NEWSLETTER FIELDS */}
              {channel === "newsletter" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nl-subject" className="text-xs font-medium text-heading">
                      Subject
                    </Label>
                    <Input
                      id="nl-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Email subject line"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nl-heading" className="text-xs font-medium text-heading">
                      Heading
                    </Label>
                    <Input
                      id="nl-heading"
                      value={form.heading}
                      onChange={(e) => setForm({ ...form, heading: e.target.value })}
                      placeholder="Main headline"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nl-message" className="text-xs font-medium text-heading">
                      Message
                    </Label>
                    <ShadTextarea
                      id="nl-message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Enter newsletter message..."
                      className="text-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* Image Controls: Upload / Replace / Remove / Preview */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-heading">Image</Label>
                    {form.imageUrl ? (
                      <div className="flex items-center justify-between gap-3 p-2 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-12 h-10 rounded overflow-hidden bg-white border border-border/50 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={form.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[11px] text-muted truncate">
                            Image attached to template
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs h-7 px-2 text-muted hover:text-heading cursor-pointer gap-1"
                          >
                            <RefreshCw size={11} />
                            Replace
                          </ShadButton>
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, imageUrl: "" }));
                              toast.success("Image removed");
                            }}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer gap-1"
                          >
                            <Trash2 size={11} />
                            Remove
                          </ShadButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.imageUrl}
                          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                          placeholder="Image URL or upload"
                          className="h-9 text-xs"
                        />
                        <ShadButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 text-xs shrink-0 gap-1.5 px-3 cursor-pointer"
                        >
                          <Upload size={13} />
                          Upload
                        </ShadButton>
                      </div>
                    )}
                  </div>

                  {/* Button & Link Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nl-button-text" className="text-xs font-medium text-heading">
                        Button Text
                      </Label>
                      <Input
                        id="nl-button-text"
                        value={form.buttonText}
                        onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                        placeholder="Open Attendee Card"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="nl-button-url" className="text-xs font-medium text-heading">
                        Button Link
                      </Label>
                      <Input
                        id="nl-button-url"
                        value={form.buttonUrl}
                        onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                        placeholder="https://..."
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Attachment Controls */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-heading">Attachment (Optional)</Label>
                    {form.attachmentName ? (
                      <div className="flex items-center justify-between gap-3 p-2 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip size={14} className="text-primary shrink-0" />
                          <span className="text-[11px] font-medium text-heading truncate">
                            {form.attachmentName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => attachmentInputRef.current?.click()}
                            className="text-xs h-7 px-2 text-muted hover:text-heading cursor-pointer gap-1"
                          >
                            <RefreshCw size={11} />
                            Replace
                          </ShadButton>
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                attachmentUrl: "",
                                attachmentName: "",
                              }));
                              toast.success("Attachment removed");
                            }}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer gap-1"
                          >
                            <Trash2 size={11} />
                            Remove
                          </ShadButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.attachmentUrl}
                          onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                          placeholder="https://example.com/document.pdf"
                          className="h-9 text-xs"
                        />
                        <ShadButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => attachmentInputRef.current?.click()}
                          className="h-9 text-xs shrink-0 gap-1.5 px-3 cursor-pointer"
                        >
                          <Paperclip size={13} />
                          Attach
                        </ShadButton>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 3. LINKEDIN FIELDS */}
              {channel === "linkedin" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="li-message" className="text-xs font-medium text-heading">
                        Message
                      </Label>
                      <span className="text-[10px] text-muted font-mono">Supports {"{{name}}"}</span>
                    </div>
                    <ShadTextarea
                      id="li-message"
                      rows={8}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Enter LinkedIn direct message..."
                      className="text-xs leading-relaxed resize-y"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="li-caption" className="text-xs font-medium text-heading">
                      Caption (Optional)
                    </Label>
                    <Input
                      id="li-caption"
                      value={form.caption}
                      onChange={(e) => setForm({ ...form, caption: e.target.value })}
                      placeholder="Follow-up note, community update..."
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {/* 4. WHATSAPP FIELDS */}
              {channel === "whatsapp" && (
                <>
                  {/* Image Controls */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-heading">Image (Optional)</Label>
                    {form.imageUrl ? (
                      <div className="flex items-center justify-between gap-3 p-2 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-12 h-10 rounded overflow-hidden bg-white border border-border/50 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={form.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[11px] text-muted truncate">Image attached</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs h-7 px-2 text-muted hover:text-heading cursor-pointer gap-1"
                          >
                            <RefreshCw size={11} />
                            Replace
                          </ShadButton>
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, imageUrl: "" }));
                              toast.success("Image removed");
                            }}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer gap-1"
                          >
                            <Trash2 size={11} />
                            Remove
                          </ShadButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.imageUrl}
                          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                          placeholder="Image URL or upload"
                          className="h-9 text-xs"
                        />
                        <ShadButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 text-xs shrink-0 gap-1.5 px-3 cursor-pointer"
                        >
                          <Upload size={13} />
                          Upload
                        </ShadButton>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wa-message" className="text-xs font-medium text-heading">
                        Message
                      </Label>
                      <span className="text-[10px] text-muted font-mono">Supports {"{{name}}"}</span>
                    </div>
                    <ShadTextarea
                      id="wa-message"
                      rows={7}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Enter WhatsApp message..."
                      className="text-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* WhatsApp Attachment Controls */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-heading">Attachment (Optional)</Label>
                    {form.attachmentName ? (
                      <div className="flex items-center justify-between gap-3 p-2 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip size={14} className="text-primary shrink-0" />
                          <span className="text-[11px] font-medium text-heading truncate">
                            {form.attachmentName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => attachmentInputRef.current?.click()}
                            className="text-xs h-7 px-2 text-muted hover:text-heading cursor-pointer gap-1"
                          >
                            <RefreshCw size={11} />
                            Replace
                          </ShadButton>
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                attachmentUrl: "",
                                attachmentName: "",
                              }));
                              toast.success("Attachment removed");
                            }}
                            className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer gap-1"
                          >
                            <Trash2 size={11} />
                            Remove
                          </ShadButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={form.attachmentUrl}
                          onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
                          placeholder="https://example.com/file.pdf"
                          className="h-9 text-xs"
                        />
                        <ShadButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => attachmentInputRef.current?.click()}
                          className="h-9 text-xs shrink-0 gap-1.5 px-3 cursor-pointer"
                        >
                          <Paperclip size={13} />
                          Attach
                        </ShadButton>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/30 mt-auto">
                <div className="flex items-center gap-1.5">
                  {/* Import / Browse Button */}
                  <ShadButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-8 gap-1 border-border/60 text-heading hover:bg-slate-50 cursor-pointer"
                    title="Import or browse document, image, or spreadsheet"
                  >
                    <FolderOpen size={13} />
                    Browse
                  </ShadButton>

                  {/* Preview Button */}
                  <ShadButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviewClick}
                    className="text-xs h-8 gap-1 text-muted hover:text-heading cursor-pointer"
                    title="Live preview"
                  >
                    <Eye size={13} />
                    Preview
                  </ShadButton>

                  {/* Save Button */}
                  <ShadButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="text-xs h-8 gap-1 text-muted hover:text-heading cursor-pointer"
                    title="Save draft"
                  >
                    <Save size={13} />
                    Save
                  </ShadButton>
                </div>

                <div className="flex items-center gap-2">
                  {/* Send Button */}
                  <ShadButton
                    type="button"
                    size="sm"
                    onClick={() => setIsConfirmOpen(true)}
                    className="text-xs h-8 font-semibold px-4 gap-1.5 cursor-pointer"
                  >
                    <SendIcon size={12} />
                    Send
                  </ShadButton>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Preview */}
            <div
              ref={previewContainerRef}
              className={`lg:col-span-6 p-6 bg-slate-50/50 flex flex-col items-center justify-center overflow-y-auto ${
                mobileTab === "edit" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="w-full flex items-center justify-between mb-4 px-2">
                <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <Eye size={13} />
                  Live Preview
                </span>
                <span className="text-[11px] text-muted font-medium capitalize">
                  Theme: {form.theme}
                </span>
              </div>

              <div className="w-full flex items-center justify-center">
                {channel === "newsletter" && (
                  <NewsletterLivePreview
                    heading={form.heading}
                    message={form.message}
                    imageUrl={form.imageUrl}
                    subject={form.subject}
                    buttonText={form.buttonText}
                    buttonUrl={form.buttonUrl}
                    attachmentName={form.attachmentName}
                    theme={form.theme}
                  />
                )}
                {channel === "linkedin" && (
                  <LinkedInLivePreview
                    message={form.message}
                    caption={form.caption}
                    theme={form.theme}
                  />
                )}
                {channel === "whatsapp" && (
                  <WhatsAppLivePreview
                    message={form.message}
                    imageUrl={form.imageUrl}
                    attachmentUrl={form.attachmentUrl}
                    attachmentName={form.attachmentName}
                    theme={form.theme}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Prompt */}
      <SendConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={executeSend}
        isSending={isSending}
      />

      {/* Spreadsheet Modal */}
      <SpreadsheetImportModal
        open={spreadsheetState.open}
        onOpenChange={(isOpen) => setSpreadsheetState((prev) => ({ ...prev, open: isOpen }))}
        fileName={spreadsheetState.fileName}
        headers={spreadsheetState.headers}
        sampleRows={spreadsheetState.sampleRows}
        totalRows={spreadsheetState.totalRows}
        eventId={eventId}
        eventName={eventName}
        onUseAsContent={(headers) => {
          const tags = headers.slice(0, 3).map((h) => `{{${h}}}`).join(" ");
          setForm((prev) => ({
            ...prev,
            message: prev.message
              ? `${prev.message}\n\nAvailable variables: ${tags}`
              : `Hi {{name}},\n\nHere are your event details:\n${tags}`,
          }));
        }}
      />
    </>
  );
}
