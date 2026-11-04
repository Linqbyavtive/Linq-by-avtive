"use client";

import { PromotionTheme } from "./types";
import { Paperclip } from "lucide-react";

interface NewsletterLivePreviewProps {
  heading: string;
  message: string;
  imageUrl?: string;
  subject?: string;
  buttonText?: string;
  buttonUrl?: string;
  attachmentName?: string;
  theme?: PromotionTheme;
}

export function NewsletterLivePreview({
  heading,
  message,
  imageUrl,
  subject,
  buttonText,
  buttonUrl,
  attachmentName,
  theme = "default",
}: NewsletterLivePreviewProps) {
  // Theme Style Configurations
  const themeStyles = {
    default: {
      card: "bg-white border-border/60 text-slate-800",
      headerBadge: "bg-primary text-white",
      heading: "text-heading font-bold",
      body: "text-slate-700",
      button: "bg-primary hover:bg-primary/90 text-white rounded-md shadow-xs",
      footer: "text-muted border-border/30",
    },
    minimal: {
      card: "bg-[#FAFAFA] border-zinc-300 text-zinc-900",
      headerBadge: "bg-black text-white",
      heading: "text-black font-semibold tracking-tight",
      body: "text-zinc-700",
      button: "bg-black hover:bg-zinc-800 text-white rounded-none border border-black",
      footer: "text-zinc-400 border-zinc-200",
    },
    dark: {
      card: "bg-[#0F172A] border-slate-800 text-slate-200 shadow-lg",
      headerBadge: "bg-indigo-500 text-white",
      heading: "text-white font-bold tracking-tight",
      body: "text-slate-300",
      button: "bg-indigo-500 hover:bg-indigo-600 text-white rounded-md shadow-md",
      footer: "text-slate-500 border-slate-800",
    },
    professional: {
      card: "bg-[#F8FAFC] border-slate-300 text-slate-800",
      headerBadge: "bg-[#1E40AF] text-white",
      heading: "text-[#0F172A] font-serif font-bold text-lg",
      body: "text-slate-700 leading-relaxed font-sans",
      button: "bg-[#1E40AF] hover:bg-[#1E3A8A] text-white rounded font-medium shadow-xs",
      footer: "text-slate-400 border-slate-200",
    },
    event: {
      card: "bg-[#FFFBF5] border-orange-200 text-slate-900",
      headerBadge: "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xs",
      heading: "text-orange-950 font-extrabold tracking-tight",
      body: "text-slate-800 leading-relaxed",
      button: "bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white rounded-full font-bold shadow-md",
      footer: "text-orange-400 border-orange-200/60",
    },
  };

  const t = themeStyles[theme] || themeStyles.default;

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Email Client Header Bar */}
      <div className="w-full max-w-[480px] bg-slate-100 border border-border/60 rounded-t-xl px-4 py-2.5 flex items-center gap-2 text-xs text-muted">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        </div>
        <span className="truncate ml-2 font-medium text-slate-600">
          {subject || "Subject preview..."}
        </span>
      </div>

      {/* Email Body Canvas */}
      <div
        className={`w-full max-w-[480px] border-x border-b rounded-b-xl shadow-xs p-6 flex flex-col gap-4 text-left transition-colors ${t.card}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold ${t.headerBadge}`}
            >
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">Linq</span>
          </div>
          <span className="text-[11px] opacity-70 font-medium uppercase tracking-wider">
            Newsletter · {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </span>
        </div>

        {/* Hero Image */}
        {imageUrl ? (
          <div className="w-full h-40 rounded-lg overflow-hidden bg-slate-100 border border-border/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Newsletter banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : null}

        {/* Heading */}
        <h3 className={`text-lg leading-snug ${t.heading}`}>
          {heading || "Your Heading Here"}
        </h3>

        {/* Body Paragraphs */}
        <div className={`text-xs leading-relaxed whitespace-pre-wrap flex flex-col gap-2 ${t.body}`}>
          {message || "Enter your newsletter message..."}
        </div>

        {/* Attachment Pill if present */}
        {attachmentName && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/5 border border-black/10 text-[11px] font-medium w-fit">
            <Paperclip size={12} />
            <span className="truncate max-w-[280px]">{attachmentName}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <a
            href={buttonUrl || "https://linq.avtive.com"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.preventDefault()}
            className={`inline-block text-xs font-semibold px-4 py-2 transition-all cursor-default ${t.button}`}
          >
            {buttonText || "Open Attendee Card"}
          </a>
        </div>

        {/* Footer */}
        <div className={`border-t pt-4 mt-2 text-[10px] text-center leading-relaxed ${t.footer}`}>
          Sent by Linq Event Operations. You are receiving this because you registered for this event.
        </div>
      </div>
    </div>
  );
}
