"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  Shield,
  Upload,
  FolderOpen,
  Eye,
  Save,
  Send as SendIcon,
  RefreshCw,
  Trash2,
  Paperclip,
  Palette,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button as ShadButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as ShadTextarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PromotionChannel, PromotionTemplate, ChannelEditorState, PromotionTheme } from "./types";
import { DEFAULT_TEMPLATES } from "./defaultTemplates";
import { NewsletterLivePreview } from "./NewsletterLivePreview";
import { LinkedInLivePreview } from "./LinkedInLivePreview";
import { WhatsAppLivePreview } from "./WhatsAppLivePreview";
import { SendConfirmDialog } from "./SendConfirmDialog";
import { TeamAccessDialog } from "./TeamAccessDialog";
import { SpreadsheetImportModal } from "./SpreadsheetImportModal";
import { parsePromotionImportFile, ImportResult } from "./importUtils";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className || "w-4 h-4"}
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25a1.62 1.62 0 0 0-1.62 1.62c0 .9.72 1.63 1.62 1.63s1.63-.73 1.63-1.63c0-.9-.73-1.62-1.63-1.62Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className || "w-4 h-4"}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.42.06-.64.3-.22.25-.85.83-.85 2.02 0 1.19.87 2.34.99 2.5.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.29-.25-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.25-.63.79-.77.95-.14.16-.28.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43s-.55-1.33-.76-1.82c-.2-.48-.41-.42-.56-.43h-.48Z" />
    </svg>
  );
}

const THEME_OPTIONS: { id: PromotionTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "#5B4DFB" },
  { id: "minimal", label: "Minimal", swatch: "#18181B" },
  { id: "dark", label: "Dark", swatch: "#0F172A" },
  { id: "professional", label: "Professional", swatch: "#1E40AF" },
  { id: "event", label: "Event", swatch: "#EA580C" },
];

const CHANNELS = [
  {
    id: "newsletter" as const,
    label: "Newsletter",
    description: "Email updates, cards & announcements",
    icon: Mail,
  },
  {
    id: "linkedin" as const,
    label: "LinkedIn",
    description: "Personalized direct message outreach",
    icon: LinkedInIcon,
  },
  {
    id: "whatsapp" as const,
    label: "WhatsApp",
    description: "Direct instant messages & reminders",
    icon: WhatsAppIcon,
  },
];

interface PromotionChannelSelectProps {
  eventId?: string;
  eventName?: string;
  onBack?: () => void;
  defaultChannel?: PromotionChannel;
  hideTopBack?: boolean;
}

function getInitialEditorForm(
  tpl: PromotionTemplate,
  eventId?: string,
): ChannelEditorState {
  let initialData: ChannelEditorState = {
    subject: tpl.subject || "",
    heading: tpl.heading || "",
    message: tpl.message || "",
    imageUrl: tpl.imageUrl || "",
    buttonText:
      tpl.buttonText ||
      (tpl.channel === "newsletter" ? "Open Attendee Card" : ""),
    buttonUrl: tpl.buttonUrl || "https://linq.avtive.com",
    attachmentUrl: tpl.attachmentUrl || "",
    attachmentName: tpl.attachmentName || "",
    caption: tpl.caption || "",
    theme: tpl.theme || "default",
  };

  try {
    if (typeof window !== "undefined") {
      const draftKey = `linq_tpl_draft_${eventId || "global"}_${tpl.id}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        initialData = { ...initialData, ...parsed };
      }
    }
  } catch {}

  return initialData;
}

export function PromotionChannelSelect({
  eventId: propEventId,
  eventName: propEventName,
  onBack,
  defaultChannel = "newsletter",
  hideTopBack = false,
}: PromotionChannelSelectProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = propEventId || searchParams.get("eventId") || undefined;
  const eventName = propEventName || searchParams.get("eventName") || undefined;
  const initialChannelParam = searchParams.get("channel") as PromotionChannel | null;

  // Active channel
  const [activeChannel, setActiveChannel] = useState<PromotionChannel>(
    initialChannelParam && ["newsletter", "linkedin", "whatsapp"].includes(initialChannelParam)
      ? initialChannelParam
      : defaultChannel,
  );

  // Template lists per channel
  const [channelTemplates, setChannelTemplates] = useState<
    Record<PromotionChannel, PromotionTemplate[]>
  >({
    newsletter: DEFAULT_TEMPLATES.newsletter,
    linkedin: DEFAULT_TEMPLATES.linkedin,
    whatsapp: DEFAULT_TEMPLATES.whatsapp,
  });

  // Current view mode: "list" (templates view) or "edit" (inline 2-column editor)
  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [selectedTemplate, setSelectedTemplate] = useState<PromotionTemplate | null>(null);

  // Editor Form State
  const [form, setForm] = useState<ChannelEditorState>({
    subject: "",
    heading: "",
    message: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    attachmentUrl: "",
    attachmentName: "",
    caption: "",
    theme: "default",
  });

  // Small Action Modals
  const [isTeamAccessOpen, setIsTeamAccessOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Spreadsheet modal state
  const [spreadsheetState, setSpreadsheetState] = useState<{
    open: boolean;
    fileName: string;
    headers: string[];
    sampleRows: Record<string, string>[];
    allRows?: Record<string, string>[];
    totalRows: number;
  }>({
    open: false,
    fileName: "",
    headers: [],
    sampleRows: [],
    allRows: [],
    totalRows: 0,
  });

  const listImportInputRef = useRef<HTMLInputElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const editorAttachmentInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTemplate = (tpl: PromotionTemplate) => {
    setSelectedTemplate(tpl);
    setForm(getInitialEditorForm(tpl, eventId));
    setViewMode("edit");
    setMobileTab("edit");
  };

  const handleChannelTabChange = (channelId: PromotionChannel) => {
    setActiveChannel(channelId);
    if (viewMode === "edit") {
      // If switching channel tab while in editor, pick the first template of the new channel
      const firstTpl = channelTemplates[channelId]?.[0] || null;
      if (firstTpl) {
        setSelectedTemplate(firstTpl);
        setForm(getInitialEditorForm(firstTpl, eventId));
      } else {
        setViewMode("list");
      }
    }
  };

  const handleSaveDraft = () => {
    try {
      if (typeof window !== "undefined" && selectedTemplate) {
        const draftKey = `linq_tpl_draft_${eventId || "global"}_${selectedTemplate.id}`;
        localStorage.setItem(draftKey, JSON.stringify(form));
      }
      toast.success(eventName ? `Draft saved for ${eventName}` : "Draft saved");
    } catch {
      toast.error("Failed to save draft");
    }
  };

  const handleSendExecute = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/promotions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: activeChannel,
          templateId: selectedTemplate?.id,
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
        toast.error(data.error || "Failed to send promotion");
        return;
      }

      toast.success(data.message || `Promotion delivered successfully`);
      setIsConfirmOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending promotion";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetContext: "list" | "editor",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }

    try {
      const result: ImportResult = await parsePromotionImportFile(file);

      if (targetContext === "list") {
        if (result.type === "text") {
          const newTemplate: PromotionTemplate = {
            id: `custom-${Date.now()}`,
            channel: activeChannel,
            name: result.heading || file.name.replace(/\.[^/.]+$/, "") || "Imported Template",
            subject: result.subject || result.heading || "Imported Announcement",
            heading: result.heading || "Imported Announcement",
            message: result.message,
            theme: "default",
          };

          setChannelTemplates((prev) => ({
            ...prev,
            [activeChannel]: [newTemplate, ...prev[activeChannel].slice(0, 2)],
          }));
          setSelectedTemplate(newTemplate);
          setForm(getInitialEditorForm(newTemplate, eventId));
          setViewMode("edit");
          toast.success("Document text imported into editor");
        } else if (result.type === "image") {
          const newTemplate: PromotionTemplate = {
            id: `custom-${Date.now()}`,
            channel: activeChannel,
            name: `Image Template (${file.name.slice(0, 15)})`,
            subject: "Announcement with image",
            heading: "New Announcement",
            message: "Check out the attached image below.",
            imageUrl: result.dataUrl,
            theme: "default",
          };

          setChannelTemplates((prev) => ({
            ...prev,
            [activeChannel]: [newTemplate, ...prev[activeChannel].slice(0, 2)],
          }));
          setSelectedTemplate(newTemplate);
          setForm(getInitialEditorForm(newTemplate, eventId));
          setViewMode("edit");
          toast.success("Image template created");
        } else if (result.type === "attachment") {
          const newTemplate: PromotionTemplate = {
            id: `custom-${Date.now()}`,
            channel: activeChannel,
            name: `Document: ${file.name.slice(0, 20)}`,
            subject: `Document: ${file.name}`,
            heading: file.name.replace(/\.[^/.]+$/, ""),
            message: `Please find the attached document: ${file.name}`,
            attachmentUrl: result.dataUrl,
            attachmentName: result.fileName,
            theme: "default",
          };

          setChannelTemplates((prev) => ({
            ...prev,
            [activeChannel]: [newTemplate, ...prev[activeChannel].slice(0, 2)],
          }));
          setSelectedTemplate(newTemplate);
          setForm(getInitialEditorForm(newTemplate, eventId));
          setViewMode("edit");
          toast.success("File attached to new template");
        } else if (result.type === "spreadsheet") {
          setSpreadsheetState({
            open: true,
            fileName: result.fileName,
            headers: result.headers,
            sampleRows: result.sampleRows,
            allRows: result.allRows,
            totalRows: result.totalRows,
          });
        } else if (result.type === "unsupported") {
          toast.error(result.message);
        }
      } else {
        // Target is Editor
        if (result.type === "image") {
          setForm((prev) => ({ ...prev, imageUrl: result.dataUrl }));
          toast.success("Image added to template");
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
            allRows: result.allRows,
            totalRows: result.totalRows,
          });
        } else if (result.type === "unsupported") {
          toast.error(result.message);
        }
      }
    } catch {
      toast.error("Failed to parse imported file");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleBackToNavigation = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (eventId) {
      router.push(`/dashboard/events/${eventId}`);
    } else {
      router.push("/dashboard");
    }
  };

  const currentTemplates = channelTemplates[activeChannel] || [];

  return (
    <div className="w-full flex flex-col gap-6 text-left animate-fade-in pb-12">
      {/* 1. TOP PAGE HEADER */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5">
        {/* Back navigation button */}
        {!hideTopBack ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToNavigation}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-heading transition-colors cursor-pointer group -ml-1 py-1"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>
                {eventId
                  ? eventName
                    ? `Back to ${eventName}`
                    : "Back to Campaign"
                  : "Back to Dashboard"}
              </span>
            </button>

            {/* Team Access dialog button */}
            <ShadButton
              variant="outline"
              size="sm"
              onClick={() => setIsTeamAccessOpen(true)}
              className="text-xs h-8 gap-1.5 border-border/60 text-heading hover:bg-slate-50 cursor-pointer"
            >
              <Shield size={13} className="text-muted" />
              Team Access
            </ShadButton>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <ShadButton
              variant="outline"
              size="sm"
              onClick={() => setIsTeamAccessOpen(true)}
              className="text-xs h-8 gap-1.5 border-border/60 text-heading hover:bg-slate-50 cursor-pointer"
            >
              <Shield size={13} className="text-muted" />
              Team Access
            </ShadButton>
          </div>
        )}

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-heading">
                Promotion
              </h1>
              {eventName && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold py-0.5 px-2.5 rounded-full"
                >
                  {eventName}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Create, customize, and deliver campaign messages across your attendee channels.
            </p>
          </div>
        </div>

        {/* 2. CHANNEL SELECTION TABS */}
        <div className="flex items-center gap-2 pt-2 overflow-x-auto scrollbar-none">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChannelTabChange(ch.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white text-heading shadow-xs border border-border/80 ring-1 ring-black/5"
                    : "text-muted hover:text-heading hover:bg-slate-100/70 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted"}`} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONDITIONAL WORKSPACE: LIST OR INLINE EDITOR */}
      {viewMode === "list" ? (
        <div className="flex flex-col gap-5">
          {/* Channel Subheader & Import Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border border-border/40 rounded-xl p-3.5">
            <div>
              <h2 className="text-sm font-semibold text-heading">
                {activeChannel === "newsletter"
                  ? "Newsletter Templates"
                  : activeChannel === "linkedin"
                    ? "LinkedIn Messages"
                    : "WhatsApp Announcements"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {activeChannel === "newsletter"
                  ? "Send formatted email updates, attendee card links, and announcements."
                  : activeChannel === "linkedin"
                    ? "Reach out directly to attendees on LinkedIn with personalized messaging."
                    : "Send instant notifications and check-in reminders on WhatsApp."}
              </p>
            </div>

            {/* Hidden Input for List View Import */}
            <input
              ref={listImportInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.csv,.xlsx,.xls,.tsv,.json,.md"
              className="hidden"
              onChange={(e) => handleFileImport(e, "list")}
            />

            <ShadButton
              variant="outline"
              size="sm"
              onClick={() => listImportInputRef.current?.click()}
              className="text-xs h-8 gap-1.5 border-border/60 self-start sm:self-auto cursor-pointer bg-white text-heading hover:bg-slate-50"
            >
              <Upload size={13} className="text-muted" />
              Import File / CSV
            </ShadButton>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {currentTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTemplate(tpl)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectTemplate(tpl);
                  }
                }}
                className="group flex flex-col justify-between bg-white border border-border/60 rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none"
              >
                {/* Visual Mini Preview Container */}
                <div className="mb-4 rounded-lg bg-slate-50 border border-border/40 p-3.5 h-44 overflow-hidden flex flex-col justify-between relative group-hover:bg-slate-50/80 transition-colors">
                  {activeChannel === "newsletter" && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                        <span className="text-[10px] font-bold text-primary">LINQ</span>
                        <span className="text-[9px] text-muted">Newsletter</span>
                      </div>
                      {tpl.imageUrl && (
                        <div className="w-full h-12 rounded bg-primary/10 flex items-center justify-center text-[10px] text-primary/60 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={tpl.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-heading truncate">{tpl.heading}</p>
                      <p className="text-[10px] text-muted line-clamp-2 leading-relaxed">
                        {tpl.message}
                      </p>
                    </div>
                  )}

                  {activeChannel === "linkedin" && (
                    <div className="flex flex-col justify-end h-full gap-2">
                      <div className="text-[9px] text-muted flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Alex (Attendee)
                      </div>
                      <div className="bg-white border border-border/50 rounded-lg p-2.5 shadow-2xs text-[11px] text-slate-700 leading-snug line-clamp-4">
                        {tpl.message.replace(/\{\{name\}\}/gi, "Alex")}
                      </div>
                    </div>
                  )}

                  {activeChannel === "whatsapp" && (
                    <div className="flex flex-col justify-end h-full gap-2">
                      <div className="text-[9px] text-[#075e54] font-semibold flex items-center gap-1">
                        WhatsApp Message
                      </div>
                      <div className="bg-[#d9fdd3] text-slate-800 rounded-md p-2.5 text-[11px] leading-snug line-clamp-4 shadow-2xs">
                        {tpl.message.replace(/\{\{name\}\}/gi, "Alex")}
                      </div>
                    </div>
                  )}

                  {/* Hover overlay hint */}
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
                </div>

                {/* Template Info & Action */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-heading leading-tight truncate">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] text-muted capitalize mt-0.5">
                      {tpl.theme || "default"} theme
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <ShadButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(tpl);
                      }}
                      className="text-xs h-8 px-2.5 text-muted hover:text-heading cursor-pointer"
                    >
                      Edit
                    </ShadButton>
                    <ShadButton
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(tpl);
                      }}
                      className="text-xs h-8 font-semibold px-3.5 cursor-pointer"
                    >
                      Use
                    </ShadButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* 4. INLINE TWO-COLUMN TEMPLATE EDITOR */
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Editor Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border/60 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <ShadButton
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-2.5 gap-1.5 text-xs font-semibold text-muted hover:text-heading cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>All Templates</span>
              </ShadButton>
              <div className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                  {activeChannel}
                </span>
                <span className="text-sm font-semibold text-heading">
                  {selectedTemplate?.name || "Template Editor"}
                </span>
              </div>
            </div>

            {/* Mobile Tab Switcher (Edit vs Preview) */}
            <div className="flex lg:hidden items-center gap-1 rounded-lg border border-border/60 bg-slate-50 p-0.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMobileTab("edit")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  mobileTab === "edit"
                    ? "bg-white text-heading shadow-xs font-semibold"
                    : "text-muted hover:text-heading"
                }`}
              >
                Edit Form
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  mobileTab === "preview"
                    ? "bg-white text-heading shadow-xs font-semibold"
                    : "text-muted hover:text-heading"
                }`}
              >
                Live Preview
              </button>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ShadButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="text-xs h-8 gap-1.5 border-border/60 text-heading hover:bg-slate-50 cursor-pointer"
              >
                <Save size={13} className="text-muted" />
                Save Draft
              </ShadButton>
              <ShadButton
                type="button"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                className="text-xs h-8 font-semibold px-4 gap-1.5 cursor-pointer"
              >
                <SendIcon size={12} />
                Send Promotion
              </ShadButton>
            </div>
          </div>

          {/* Two-Column Editor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Editing Form */}
            <div
              className={`lg:col-span-6 flex flex-col gap-5 bg-white border border-border/60 rounded-xl p-6 shadow-xs ${
                mobileTab === "preview" ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Hidden Global File Input for Browse/Extract */}
              <input
                ref={editorFileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt,.csv,.xlsx,.xls,.tsv,.json,.md"
                className="hidden"
                onChange={(e) => handleFileImport(e, "editor")}
              />

              {/* Hidden Attachment input */}
              <input
                ref={editorAttachmentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="hidden"
                onChange={(e) => handleFileImport(e, "editor")}
              />

              {/* 1. Theme Selector */}
              <div className="flex flex-col gap-2 pb-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-heading flex items-center gap-1.5">
                    <Palette size={14} className="text-primary" />
                    Template Theme
                  </Label>
                  <span className="text-[11px] text-muted">Select design styling</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {THEME_OPTIONS.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, theme: th.id }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
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

              {/* 2. NEWSLETTER FORM CONTROLS */}
              {activeChannel === "newsletter" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nl-subject" className="text-xs font-semibold text-heading">
                      Subject Line
                    </Label>
                    <Input
                      id="nl-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Important updates regarding your event attendance"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="nl-heading" className="text-xs font-semibold text-heading">
                      Main Headline
                    </Label>
                    <Input
                      id="nl-heading"
                      value={form.heading}
                      onChange={(e) => setForm({ ...form, heading: e.target.value })}
                      placeholder="e.g. Welcome to the Annual Tech Summit 2026"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nl-message" className="text-xs font-semibold text-heading">
                        Message Body
                      </Label>
                      <button
                        type="button"
                        onClick={() => editorFileInputRef.current?.click()}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FolderOpen size={11} />
                        Extract from document
                      </button>
                    </div>
                    <ShadTextarea
                      id="nl-message"
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Enter newsletter message..."
                      className="text-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* Image Upload/URL Controls */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-heading">Banner Image</Label>
                    {form.imageUrl ? (
                      <div className="flex items-center justify-between gap-3 p-2.5 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-10 rounded overflow-hidden bg-white border border-border/50 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={form.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[11px] text-muted truncate">
                            Image attached to newsletter
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editorFileInputRef.current?.click()}
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
                          onClick={() => editorFileInputRef.current?.click()}
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
                      <Label htmlFor="nl-button-text" className="text-xs font-semibold text-heading">
                        Button Label
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
                      <Label htmlFor="nl-button-url" className="text-xs font-semibold text-heading">
                        Button Link
                      </Label>
                      <Input
                        id="nl-button-url"
                        value={form.buttonUrl}
                        onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                        placeholder="https://linq.avtive.com"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Attachment Controls */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-heading">
                      Attachment (Optional)
                    </Label>
                    {form.attachmentName ? (
                      <div className="flex items-center justify-between gap-3 p-2.5 border border-border/60 rounded-lg bg-slate-50/70">
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
                            onClick={() => editorAttachmentInputRef.current?.click()}
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
                          onClick={() => editorAttachmentInputRef.current?.click()}
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

              {/* 3. LINKEDIN FORM CONTROLS */}
              {activeChannel === "linkedin" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="li-message" className="text-xs font-semibold text-heading">
                        Direct Message
                      </Label>
                      <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                        Supports {"{{name}}"}
                      </span>
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
                    <Label htmlFor="li-caption" className="text-xs font-semibold text-heading">
                      Topic / Note (Optional)
                    </Label>
                    <Input
                      id="li-caption"
                      value={form.caption}
                      onChange={(e) => setForm({ ...form, caption: e.target.value })}
                      placeholder="e.g. Follow-up note, community update..."
                      className="h-9 text-xs"
                    />
                  </div>
                </>
              )}

              {/* 4. WHATSAPP FORM CONTROLS */}
              {activeChannel === "whatsapp" && (
                <>
                  {/* WhatsApp Image */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-heading">Image (Optional)</Label>
                    {form.imageUrl ? (
                      <div className="flex items-center justify-between gap-3 p-2.5 border border-border/60 rounded-lg bg-slate-50/70">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-10 rounded overflow-hidden bg-white border border-border/50 shrink-0">
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
                            onClick={() => editorFileInputRef.current?.click()}
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
                          onClick={() => editorFileInputRef.current?.click()}
                          className="h-9 text-xs shrink-0 gap-1.5 px-3 cursor-pointer"
                        >
                          <Upload size={13} />
                          Upload
                        </ShadButton>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Message */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wa-message" className="text-xs font-semibold text-heading">
                        Message Content
                      </Label>
                      <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                        Supports {"{{name}}"}
                      </span>
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

                  {/* WhatsApp Attachment */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-heading">
                      Attachment (Optional)
                    </Label>
                    {form.attachmentName ? (
                      <div className="flex items-center justify-between gap-3 p-2.5 border border-border/60 rounded-lg bg-slate-50/70">
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
                            onClick={() => editorAttachmentInputRef.current?.click()}
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
                          onClick={() => editorAttachmentInputRef.current?.click()}
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

              {/* Bottom Action Toolbar */}
              <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-2">
                <ShadButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="text-xs h-8 text-muted hover:text-heading cursor-pointer"
                >
                  Cancel
                </ShadButton>

                <div className="flex items-center gap-2">
                  <ShadButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    className="text-xs h-8 gap-1.5 border-border/60 text-heading hover:bg-slate-50 cursor-pointer"
                  >
                    <Save size={12} />
                    Save Draft
                  </ShadButton>
                  <ShadButton
                    type="button"
                    size="sm"
                    onClick={() => setIsConfirmOpen(true)}
                    className="text-xs h-8 font-semibold px-4 gap-1.5 cursor-pointer"
                  >
                    <SendIcon size={12} />
                    Send Promotion
                  </ShadButton>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Preview Canvas */}
            <div
              className={`lg:col-span-6 flex flex-col items-center bg-slate-50/70 border border-border/60 rounded-xl p-6 shadow-xs ${
                mobileTab === "edit" ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                  <Eye size={14} className="text-primary" />
                  Live Preview
                </span>
                <span className="text-[11px] text-muted font-medium capitalize">
                  Theme: {form.theme}
                </span>
              </div>

              <div className="w-full flex items-center justify-center py-2">
                {activeChannel === "newsletter" && (
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
                {activeChannel === "linkedin" && (
                  <LinkedInLivePreview
                    message={form.message}
                    caption={form.caption}
                    theme={form.theme}
                  />
                )}
                {activeChannel === "whatsapp" && (
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
        </div>
      )}

      {/* 5. PRESERVED SMALL ACTION MODALS */}
      {/* Team Access Modal */}
      <TeamAccessDialog
        open={isTeamAccessOpen}
        onOpenChange={setIsTeamAccessOpen}
        eventId={eventId}
      />

      {/* Send Confirmation Modal */}
      <SendConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleSendExecute}
        isSending={isSending}
      />

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        open={spreadsheetState.open}
        onOpenChange={(isOpen) => setSpreadsheetState((prev) => ({ ...prev, open: isOpen }))}
        fileName={spreadsheetState.fileName}
        headers={spreadsheetState.headers}
        sampleRows={spreadsheetState.sampleRows}
        allRows={spreadsheetState.allRows}
        totalRows={spreadsheetState.totalRows}
        eventId={eventId}
        eventName={eventName}
        onUseAsContent={(headers) => {
          const tags = headers.slice(0, 3).map((h) => `{{${h}}}`).join(" ");
          const newTemplate: PromotionTemplate = {
            id: `spreadsheet-${Date.now()}`,
            channel: activeChannel,
            name: `Data: ${spreadsheetState.fileName.slice(0, 15)}`,
            subject: "Update with your personalized information",
            heading: "Personalized Announcement",
            message: `Hi {{name}},\n\nHere are your event details:\n${tags}`,
            theme: "default",
          };
          setChannelTemplates((prev) => ({
            ...prev,
            [activeChannel]: [newTemplate, ...prev[activeChannel].slice(0, 2)],
          }));
          setSelectedTemplate(newTemplate);
          setForm(getInitialEditorForm(newTemplate, eventId));
          setViewMode("edit");
        }}
      />
    </div>
  );
}
