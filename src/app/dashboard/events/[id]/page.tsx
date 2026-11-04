"use client";
import { useState, useEffect, use, useMemo, useCallback, Suspense, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useInternalUserId } from "@/lib/auth/use-internal-user-id";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";
import { Button, TextInput, AnimatedCounter, FilePicker, TimeInput } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button as ShadButton, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea as ShadTextarea } from "@/components/ui/textarea";
import { CardTypographyPicker } from "@/components/CardTypographyPicker";
import { isDeleteConfirmMatch, normalizeDeleteConfirmText } from "@/lib/ui/delete-confirm";
import { buildLinkedInFeedShareUrl } from "@/lib/share/linkedin-card-share";

import {
  Users,
  Calendar,
  MapPin,
  Search,
  Trash2,
  Download,
  ArrowLeft,
  User,
  ExternalLink,
  Link as LinkIcon,
  Pencil,
  Copy,
  X,
  RefreshCw,
  Sparkles,
  Globe,
  Handshake,
  Activity,
  TrendingUp,
  Layers3,
  Undo2,
  Redo2,
  ShieldCheck,
  Lock,
  SlidersHorizontal,
  MoreVertical,
  AlertCircle,
  QrCode,
  Megaphone,
} from "lucide-react";
import { QrAttendanceScannerModal } from "@/components/QrAttendanceScannerModal";

import { CardData, EventData } from "@/types/card";
import { toast } from "sonner";
import { cn, getEventStatus } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAutoRefresh, useDashboardMotion } from "@/lib/ui/useDashboardMotion";
import { toCompactShareUrl } from "@/lib/ui/share-short-link";
import { logger } from "@/lib/logger-client";
import {
  useOrgRegistrationStream,
  type RegistrationRequestSummary,
} from "@/lib/ui/useRegistrationRealtime";
import { EventSponsorsForm } from "@/components/EventSponsorsForm";
import { parseEventSponsors, resolveSponsorRowsToEntries, type SponsorFormRow } from "@/lib/sponsors";
import { isValidUuid } from "@/lib/validation/uuid";
import { CAMPAIGN_LOGO_CROP_ASPECT } from "@/lib/ui/crop-presets";
import {
  dashboardContentInset,
  dashboardMainTransparent,
  dashboardMainWhiteCenter,
  dashboardPreviewBannerOuter,
  dashboardPreviewBannerInner,
  dashboardModalBackdrop,
} from "@/lib/ui/dashboard-shell";
import { CardPreview, isValidCssColor } from "@/components/CardPreview";
import { BrandingDualPreview } from "@/components/BrandingDualPreview";
import { CustomColorPicker } from "@/components/CustomColorPicker";
import {
  type RegistrationFieldDefinition,
  type RegistrationFormConfig,
  getDefaultRegistrationFormConfig,
  getEnabledFieldsForRole,
  normalizeRegistrationFormConfig,
} from "@/lib/registration-form";
import { asPayloadRecord, getPayloadError, readResponsePayload } from "@/lib/http/read-response-payload";

type AttendeeCard = CardData & {
  photo_path?: string;
  attended?: boolean;
  hasAttendanceCode?: boolean;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};
type PendingAccessRequest = {
  id: string;
  requester_user_id: string;
  requested_action: string;
  note?: string | null;
  requester_email: string;
  created_at: string;
};
type ActiveGrant = {
  id: string;
  grantee_user_id: string;
  grantee_email: string;
  grantee_name: string;
  role_label: string;
  permission: string;
  created_at: string;
};
type PendingRegistrationRequest = RegistrationRequestSummary;
const CORE_PREVIEW_FIELD_IDS = new Set(["name", "role", "company", "email", "linkedin", "photo"]);
const BRAND_THEME_COLORS = [
  { name: "purple", label: "Electric Purple", start: "#41295a", end: "#2f0743", accent: "#FFD400" },
  { name: "red",    label: "Crimson",         start: "#c94b4b", end: "#4b134f", accent: "#FFFFFF" },
  { name: "pink",   label: "Sunset Blaze",    start: "#EE0979", end: "#FF6A00", accent: "#FFFFFF" },
  { name: "blue",   label: "Ocean Mist",      start: "#D3CCE3", end: "#E9E4F0", accent: "#000000" },
];
const BRAND_PRESET_THEME_NAMES = new Set(BRAND_THEME_COLORS.map((c) => c.name));

const TEXT_COLOR_QUICK_SWATCHES = [
  { hex: "#FFFFFF", label: "Pure White" },
  { hex: "#E0F2FE", label: "Cyber Ice" },
  { hex: "#FEF08A", label: "Golden Glow" },
  { hex: "#DCFCE7", label: "Light Mint" },
  { hex: "#FCE7F3", label: "Soft Rose" },
  { hex: "#0F172A", label: "Dark Slate" },
];

type CardBrandingDraft = {
  card_color: string;
  card_font: string;
  horizontal_text_color: string;
  vertical_text_color: string;
};

function cloneCardBrandingDraft(d: CardBrandingDraft): CardBrandingDraft {
  return { ...d };
}

function cardBrandingDraftsEqual(a: CardBrandingDraft, b: CardBrandingDraft) {
  return (
    a.card_color === b.card_color &&
    a.card_font === b.card_font &&
    a.horizontal_text_color === b.horizontal_text_color &&
    a.vertical_text_color === b.vertical_text_color
  );
}

function EventContent({ params }: { params: Promise<{ id: string }> }) {
  const EVENT_NAME_MAX_CHARS = 18;
  const CAMPAIGN_DESCRIPTION_MAX_CHARS = 220;
  const router = useRouter();
  const { id } = use(params);

  const searchParams = useSearchParams();
  const impersonateId = searchParams.get("impersonate");
  const isPreviewMode = !!impersonateId;
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [cards, setCards] = useState<AttendeeCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "guest" | "visitor">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGuestCategoryOpen, setIsGuestCategoryOpen] = useState(false);
  const [guestCategoryInput, setGuestCategoryInput] = useState("");
  const [guestCategoryError, setGuestCategoryError] = useState("");
  const [isShareActionsOpen, setIsShareActionsOpen] = useState(false);
  const [shareDraftUrl, setShareDraftUrl] = useState("");
  const [shareDraftMessage, setShareDraftMessage] = useState("");
  const [shareDraftRole, setShareDraftRole] = useState<"guest" | "visitor">("visitor");
  const shareRef = useRef<HTMLDivElement>(null);

  // Custom Email Modal and Menu states
  const [activeMenuAttendeeId, setActiveMenuAttendeeId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalAttendee, setEmailModalAttendee] = useState<AttendeeCard | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Close share menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setIsShareOpen(false);
      }
    };
    if (isShareOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isShareOpen]);

  // Close filter menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isFilterOpen]);

  // Close attendee ellipsis menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".attendee-menu-container")) {
        setActiveMenuAttendeeId(null);
      }
    };
    if (activeMenuAttendeeId) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeMenuAttendeeId]);

  // Edit event modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", location: "", location_type: "onsite", date: "", time: "", logo: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditingCampaignDescription, setIsEditingCampaignDescription] = useState(false);
  const [campaignDescriptionDraft, setCampaignDescriptionDraft] = useState("");
  const [isSavingCampaignDescription, setIsSavingCampaignDescription] = useState(false);

  // Delete event modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicate
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Renew event modal
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ location: "", date: "", logo: "" });
  const [isRenewing, setIsRenewing] = useState(false);

  const [isSponsorsOpen, setIsSponsorsOpen] = useState(false);
  const [sponsorRows, setSponsorRows] = useState<SponsorFormRow[]>([]);
  const [isSavingSponsors, setIsSavingSponsors] = useState(false);
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [formBuilderRole, setFormBuilderRole] = useState<"guest" | "visitor">("visitor");
  const [registrationFormDraft, setRegistrationFormDraft] = useState<RegistrationFormConfig>(
    getDefaultRegistrationFormConfig(),
  );
  const [isSavingRegistrationForm, setIsSavingRegistrationForm] = useState(false);
  const [brandingDraft, setBrandingDraft] = useState<CardBrandingDraft>({
    card_color: "purple",
    card_font: "inter",
    horizontal_text_color: "",
    vertical_text_color: "",
  });
  const [brandingUndoStack, setBrandingUndoStack] = useState<CardBrandingDraft[]>([]);
  const [brandingRedoStack, setBrandingRedoStack] = useState<CardBrandingDraft[]>([]);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const editBrandingDraft = useCallback((recipe: (prev: CardBrandingDraft) => CardBrandingDraft) => {
    setBrandingDraft((prev) => {
      const next = recipe(prev);
      if (cardBrandingDraftsEqual(prev, next)) return prev;
      const snapshot = cloneCardBrandingDraft(prev);
      setBrandingUndoStack((s) => [...s, snapshot]);
      setBrandingRedoStack([]);
      return next;
    });
  }, []);

  const undoBrandingEdit = useCallback(() => {
    if (brandingUndoStack.length === 0) return;
    const past = [...brandingUndoStack];
    const restored = past.pop()!;
    setBrandingRedoStack((redo) => [cloneCardBrandingDraft(brandingDraft), ...redo]);
    setBrandingUndoStack(past);
    setBrandingDraft(restored);
  }, [brandingDraft, brandingUndoStack]);

  const redoBrandingEdit = useCallback(() => {
    if (brandingRedoStack.length === 0) return;
    const redoList = [...brandingRedoStack];
    const replay = redoList.shift()!;
    setBrandingUndoStack((u) => [...u, cloneCardBrandingDraft(brandingDraft)]);
    setBrandingRedoStack(redoList);
    setBrandingDraft(replay);
  }, [brandingDraft, brandingRedoStack]);
  const [showBrandCustomColorPicker, setShowBrandCustomColorPicker] = useState(false);
  const [draftBrandCustomColor, setDraftBrandCustomColor] = useState("#2563EB");
  const [brandColorBeforePicker, setBrandColorBeforePicker] = useState("#2563EB");
  const [brandCustomColorAnchorRect, setBrandCustomColorAnchorRect] = useState<DOMRect | null>(null);
  const [showBrandTextColorPicker, setShowBrandTextColorPicker] = useState(false);
  const [draftBrandTextColor, setDraftBrandTextColor] = useState("#FFFFFF");
  const [brandTextColorBeforePicker, setBrandTextColorBeforePicker] = useState("#FFFFFF");
  const [brandTextColorAnchorRect, setBrandTextColorAnchorRect] = useState<DOMRect | null>(null);
  const [activeBrandTextTarget, setActiveBrandTextTarget] = useState<"horizontal" | "vertical">("horizontal");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "url">("text");
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);
  const [accessRequestAction, setAccessRequestAction] = useState("manage_event");
  const [accessRequestNote, setAccessRequestNote] = useState("");
  const [isSubmittingAccessRequest, setIsSubmittingAccessRequest] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<PendingAccessRequest[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationRequest[]>([]);
  const [pendingRegistrationCount, setPendingRegistrationCount] = useState(0);
  const [isRegistrationInboxOpen, setIsRegistrationInboxOpen] = useState(false);
  const [rejectingRegistrationId, setRejectingRegistrationId] = useState<string | null>(null);
  const [registrationRejectionReason, setRegistrationRejectionReason] = useState("");
  const [reviewingRegistrationId, setReviewingRegistrationId] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [attendanceModalCardId, setAttendanceModalCardId] = useState<string | null>(null);
  const [attendanceCodeInput, setAttendanceCodeInput] = useState("");
  const [markingAttendanceId, setMarkingAttendanceId] = useState<string | null>(null);
  const [isAccessInboxOpen, setIsAccessInboxOpen] = useState(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const [activeGrants, setActiveGrants] = useState<ActiveGrant[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
  const [isOrgAdminReviewer, setIsOrgAdminReviewer] = useState(false);
  const [organizationBranding, setOrganizationBranding] = useState({
    name: "",
    logoUrl: "",
  });
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const sessionUserId = session?.user?.id;
  const { userId, isLoading: isInternalUserLoading } = useInternalUserId(Boolean(sessionUserId), isSessionPending);
  const { presets, fadeUp, staggerItem, hoverLift, hoverIconNudge } = useDashboardMotion();
  const { refreshTick, triggerRefresh } = useAutoRefresh(Boolean(userId));
  /** When only `refreshTick` changes (focus / interval), refetch without full-page skeleton so modals and file pickers are not unmounted mid-interaction. */
  const eventPageLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isInternalUserLoading) return;

    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 6000);

    const resolveAuthedUserIdWithRetry = async (): Promise<string> => {
      if (userId) return userId;
      if (sessionUserId) return sessionUserId;
      try {
        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authPayload = await readResponsePayload(authRes);
        const resolvedUserId =
          authPayload &&
          typeof authPayload === "object" &&
          "data" in authPayload &&
          authPayload.data &&
          typeof authPayload.data === "object" &&
          "userId" in authPayload.data &&
          typeof authPayload.data.userId === "string"
            ? authPayload.data.userId
            : "";
        if (resolvedUserId) return resolvedUserId;
      } catch {}
      return "";
    };

    const checkUser = async () => {
      if (!isMounted) return;
      const effectiveViewerId = userId || (await resolveAuthedUserIdWithRetry());
      if (!isMounted) return;
      if (!effectiveViewerId) {
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      const loadKey = `${id}|${effectiveViewerId}|${String(impersonateId ?? "")}|${isPreviewMode}`;
      const loadKeyChanged = eventPageLoadKeyRef.current !== loadKey;
      const silentPoll = !loadKeyChanged && refreshTick > 0;
      if (loadKeyChanged) {
        eventPageLoadKeyRef.current = loadKey;
      }

      setCurrentUserId(effectiveViewerId);
      await fetchEventData(effectiveViewerId, silentPoll);
    };

    const fetchEventData = async (viewerId: string, silentPoll = false) => {
      if (!id || id === "id" || !isValidUuid(id)) {
        if (isMounted) {
          setEventData(null);
          setCards([]);
          setIsLoading(false);
        }
        return;
      }

      if (!silentPoll) {
        setIsLoading(true);
      }
      try {
        const eventRes = await fetch(
          `/api/events/${id}${isPreviewMode && impersonateId ? `?impersonate=${encodeURIComponent(impersonateId)}` : ""}`,
        );
        const eventPayload = await readResponsePayload(eventRes);
        if (eventRes.status === 404) {
          if (!silentPoll) {
            toast.error("This campaign no longer exists.");
          }
          router.replace(isPreviewMode ? "/admin" : "/dashboard");
          return;
        }
        if (!eventRes.ok) {
          throw new Error(getPayloadError(eventPayload, "Failed to load event."));
        }
        const eventRecord =
          eventPayload &&
          typeof eventPayload === "object" &&
          "data" in eventPayload &&
          eventPayload.data &&
          typeof eventPayload.data === "object"
            ? (eventPayload.data as Record<string, unknown>)
            : null;
        if (!eventRecord) {
          throw new Error("Failed to load event.");
        }
        if (!isMounted) return;

        try {
          const brandingRes = await fetch(`/api/events/${id}/branding`);
          const brandingPayload = await readResponsePayload(brandingRes);
          const brandingData = asPayloadRecord(brandingPayload);
          if (brandingRes.ok && brandingData && isMounted) {
            setOrganizationBranding({
              name: String(brandingData.organizationName || ""),
              logoUrl: String(brandingData.organizationLogoUrl || ""),
            });
          }
        } catch {
          // Keep fallback branding values when branding endpoint fails.
        }

        setEventData({
          id: String(eventRecord.id || ""),
          name: String(eventRecord.name || ""),
          description: String(eventRecord.description || ""),
          location: String(eventRecord.location || ""),
          location_type: (eventRecord.location_type as "onsite" | "webinar" | undefined) || "onsite",
          date: String(eventRecord.date || ""),
          time: String(eventRecord.time || ""),
          user: String(eventRecord.user_id || ""),
          logo_url: String(eventRecord.logo_url || ""),
          sponsors: parseEventSponsors(eventRecord.sponsors),
          registration_form_config: normalizeRegistrationFormConfig(eventRecord.registration_form_config),
          card_color: String(eventRecord.card_color || "purple"),
          card_font: String(eventRecord.card_font || "inter"),
          horizontal_text_color: String(eventRecord.horizontal_text_color || ""),
          vertical_text_color: String(eventRecord.vertical_text_color || ""),
          is_branding_finalized: Boolean(eventRecord.is_branding_finalized),
        });
        if (!isBrandingOpen) {
          setBrandingDraft({
            card_color: String(eventRecord.card_color || "purple"),
            card_font: String(eventRecord.card_font || "inter"),
            horizontal_text_color: String(eventRecord.horizontal_text_color || ""),
            vertical_text_color: String(eventRecord.vertical_text_color || ""),
          });
        }

        if (searchParams.get("edit") === "true") {
          setEditForm({
            name: String(eventRecord.name || ""),
            description: String(eventRecord.description || ""),
            location: eventRecord.location_type === "webinar" ? "" : String(eventRecord.location || ""),
            location_type: (eventRecord.location_type as "onsite" | "webinar" | undefined) || "onsite",
            date: String(eventRecord.date || ""),
            time: String(eventRecord.time || ""),
            logo: String(eventRecord.logo_url || ""),
          });
          setIsEditOpen(true);
        } else if (searchParams.get("promotion") === "true" || searchParams.get("tab") === "promotion") {
          router.push(`/dashboard/events/${id}/promotions`);
        }

        const [memberResult, attendeeRes] = await Promise.all([
          fetch("/api/organization-members/me")
            .then(async (res) => {
              const payload = await readResponsePayload(res);
              const ownerId = res.ok ? String((payload as { data?: { org_owner_user_id?: string } })?.data?.org_owner_user_id || "") : "";
              return Boolean(ownerId && ownerId === String(eventRecord.user_id || ""));
            })
            .catch(() => false),
          fetch(
            `/api/events/${id}/attendees${isPreviewMode && impersonateId ? `?impersonate=${encodeURIComponent(impersonateId)}` : ""}`,
          ),
        ]);
        setIsOrgAdminReviewer(memberResult);

        let attendeeRecords: Array<Record<string, unknown>> = [];
        if (!attendeeRes.ok) {
          const errPayload = await readResponsePayload(attendeeRes);
          const errMsg = getPayloadError(errPayload, attendeeRes.statusText);
          if (attendeeRes.status === 403) {
            // Team members without card-read grants can still access event shell.
            attendeeRecords = [];
          } else {
            throw new Error(errMsg || "Failed to fetch decrypted attendees");
          }
        } else {
          const attendeePayload = await readResponsePayload(attendeeRes);
          attendeeRecords = Array.isArray((attendeePayload as { data?: unknown[] })?.data)
            ? ((attendeePayload as { data: unknown[] }).data as Array<Record<string, unknown>>)
            : [];
        }
        if (!isMounted) return;

        const mappedCards = (attendeeRecords || []).map((secure: Record<string, unknown>) => {
          const customFields =
            secure.custom_fields && typeof secure.custom_fields === "object" && !Array.isArray(secure.custom_fields)
              ? (secure.custom_fields as Record<string, unknown>)
              : {};
          const customEmail = customFields.email || customFields.Email || customFields.card_email;
          const resolvedEmail = String(secure.card_email || customEmail || "").trim();

          return {
            id: String(secure.id || ""),
            name: String(secure.name || ""),
            role: String(secure.role || "Lead"),
            company: String(secure.company || ""),
            email: resolvedEmail,
            eventName: String(secure.event_name || ""),
            sessionDate: String(secure.session_date || ""),
            sessionTime: String(secure.session_time || ""),
            location: String(secure.location || ""),
            track: String(secure.track || ""),
            guestCategory: String(secure.guest_category || ""),
            year: String(secure.year || ""),
            linkedin: String(secure.linkedin || ""),
            event_id: String(secure.event_id || ""),
            photo: typeof secure.photo_url === "string" && secure.photo_url ? secure.photo_url : undefined,
            photo_path: typeof secure.photo_url === "string" ? secure.photo_url : undefined,
            cardPreviewUrl: typeof secure.card_preview_url === "string" ? secure.card_preview_url : undefined,
            designType: String(secure.design_type || ""),
            color: String(secure.card_color || ""),
            fontFamily: String(secure.card_font || ""),
            attended: Boolean(secure.attended),
            hasAttendanceCode: Boolean(secure.attendance_code),
            customFields,
            createdAt: String(secure.created_at || ""),
            updatedAt: String(secure.updated_at || ""),
          };
        });

        setCards(mappedCards);

        setGrantedPermissions(
          Array.isArray((eventPayload as { data?: { permissions?: string[] } })?.data?.permissions)
            ? (eventPayload as { data: { permissions: string[] } }).data.permissions
            : [],
        );

        if (eventRecord.user_id === viewerId || memberResult) {
          try {
            const [reqRes, registrationRes] = await Promise.all([
              fetch(`/api/access-requests?eventId=${id}`),
              fetch(`/api/events/${id}/registrations`),
            ]);
            const reqPayload = await readResponsePayload(reqRes);
            if (reqRes.ok && (reqPayload as { data?: { requests?: unknown } })?.data?.requests) {
              setPendingAccessRequests((reqPayload as { data: { requests: PendingAccessRequest[] } }).data.requests);
            }
            const registrationPayload = await readResponsePayload(registrationRes);
            if (registrationRes.ok && (registrationPayload as { data?: { requests?: unknown } })?.data?.requests) {
              const regData = registrationPayload as {
                data: { requests: PendingRegistrationRequest[] };
                pagination?: { total?: number };
              };
              setPendingRegistrations(regData.data.requests);
              setPendingRegistrationCount(
                Number(regData.pagination?.total ?? regData.data.requests.length),
              );
            } else {
              setPendingRegistrations([]);
              setPendingRegistrationCount(0);
            }
          } catch (err) {
            logger.error({ err }, "Could not load moderation queues");
          }
        } else {
          setPendingAccessRequests([]);
          setPendingRegistrations([]);
          setPendingRegistrationCount(0);
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ message }, "Event Fetch Error");
        if (!silentPoll) {
          toast.error("Failed to load event data.");
        }
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted && !silentPoll) {
          setIsLoading(false);
        }
      }
    };

    checkUser();
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [id, router, impersonateId, isPreviewMode, sessionUserId, userId, refreshTick, isInternalUserLoading]);

  const status = useMemo(() => getEventStatus(eventData?.date), [eventData?.date]);
  const minCampaignDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  }, []);
  const isEventOwner = Boolean(eventData?.user && currentUserId && eventData.user === currentUserId);
  const canReviewAccessRequests = isEventOwner;
  const canReviewRegistrations = isEventOwner || isOrgAdminReviewer;
  const canManageEvent = isEventOwner || grantedPermissions.includes("manage_event");
  const canDeleteEvent = canManageEvent || grantedPermissions.includes("delete_event");
  const canEditCards = canManageEvent || grantedPermissions.includes("edit_cards");
  const canDeleteCards = canManageEvent || grantedPermissions.includes("delete_cards");
  const canExport = canManageEvent;
  const isTeamMemberEventMode = !isPreviewMode && !isEventOwner && isOrgAdminReviewer;
  const isOrgAdminEventMode = !isPreviewMode && isEventOwner;
  const effectiveRegistrationConfig = normalizeRegistrationFormConfig(
    eventData?.registration_form_config || getDefaultRegistrationFormConfig(),
  );
  const previewGuestFields = getEnabledFieldsForRole(effectiveRegistrationConfig, "guest");
  const previewVisitorFields = getEnabledFieldsForRole(effectiveRegistrationConfig, "visitor");
  const isBrandingFinalized = Boolean(eventData?.is_branding_finalized);
  const brandingPreviewData = useMemo(
    () => ({
      eventName: eventData?.name || "New Event",
      sessionDate: eventData?.date || "",
      sessionTime: eventData?.time || "",
      location: eventData?.location || "",
      cardRole: "visitor" as const,
      name: "Attendee Name",
      role: "Role/Title",
      company: "Organization",
      color: brandingDraft.card_color || "purple",
      fontFamily: brandingDraft.card_font || "inter",
      horizontalTextColor: brandingDraft.horizontal_text_color || "",
      verticalTextColor: brandingDraft.vertical_text_color || "",
      sponsors: eventData?.sponsors || [],
      organizationName: organizationBranding.name || "Organization",
      organizationLogoUrl: organizationBranding.logoUrl || eventData?.logo_url || "",
      linkedin: "",
    }),
    [eventData, brandingDraft, organizationBranding],
  );
  const isBrandCustomThemeSelected = !BRAND_PRESET_THEME_NAMES.has(brandingDraft.card_color || "");
  const isBrandCustomPickerActive = showBrandCustomColorPicker || isBrandCustomThemeSelected;

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Apply track filter first
    let filtered = cards;
    if (trackFilter === "guest") {
      filtered = cards.filter(card => String(card.track || "").toLowerCase() === "guest");
    } else if (trackFilter === "visitor") {
      filtered = cards.filter(card => String(card.track || "").toLowerCase() === "visitor");
    }
    
    // Then apply search filter
    if (!query) return filtered;

    return filtered.filter(card => {
      const name = (card.name || "").toLowerCase();
      const company = (card.company || "").toLowerCase();
      const role = (card.role || "").toLowerCase();
      // Concatenate for a broader search matches
      const searchBlob = `${name} ${company} ${role}`;
      return searchBlob.includes(query);
    });
  }, [searchQuery, cards, trackFilter]);
  const ownerGuestCount = cards.filter((card) => String(card.track || "").toLowerCase() === "guest").length;
  const ownerVisitorCount = cards.filter((card) => String(card.track || "").toLowerCase() === "visitor").length;
  const ownerTopRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    for (const card of cards) {
      const role = String(card.role || "Lead").trim() || "Lead";
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    }
    return Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [cards]);

  const handleDelete = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this attendee card?")) return;

    try {
      // Delete the photo from storage too if there is one
      const card = cards.find(c => c.id === cardId);
      const photoPath = card?.photo_path;
      if (photoPath) {
        await fetch("/api/media/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: photoPath }),
        });
      }

      const deleteRes = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      const deletePayload = await readResponsePayload(deleteRes);
      if (!deleteRes.ok) throw new Error(getPayloadError(deletePayload, "Failed to delete card."));

      setCards(prev => prev.filter(c => c.id !== cardId));
      toast.success("Card deleted successfully.");
      router.refresh();
    } catch (err) {
      logger.error({ err }, "Error deleting card");
      toast.error("Failed to delete card.");
    }
  };

  const closeAttendanceModal = () => {
    setAttendanceModalCardId(null);
    setAttendanceCodeInput("");
  };

  const handleOpenMarkAttendanceScanner = () => {
    if (status.label !== "Today") {
      toast.error("Attendance can only be marked while the event is live.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      toast.error(
        "Attendance scanning requires a camera-enabled device. Please open this page on a mobile phone or another device with a camera."
      );
      return;
    }

    // Open the scanner modal directly — it handles camera permission
    // prompting and error display via Html5Qrcode.getCameras() internally.
    setIsQrScannerOpen(true);
  };

  const handleSendCustomEmail = async () => {
    if (!emailModalAttendee) return;
    const subject = emailSubject.trim();
    const body = emailBody.trim();

    if (!subject || !body) {
      toast.error("Please fill in both the Subject and Email Body.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/events/${id}/attendees/${emailModalAttendee.id}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject, body }),
      });

      const payload = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(getPayloadError(payload, "Failed to send email."));
      }

      toast.success("Email sent successfully.");
      setIsEmailModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const submitAttendance = async () => {
    if (!attendanceModalCardId) return;
    const code = attendanceCodeInput.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter a valid 6-digit attendance code.");
      return;
    }

    setMarkingAttendanceId(attendanceModalCardId);
    try {
      const res = await fetch(`/api/events/${id}/attendees/${attendanceModalCardId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await readResponsePayload(res);
      if (!res.ok) {
        throw new Error(getPayloadError(body, "Failed to mark attendance."));
      }

      const alreadyAttended =
        body &&
        typeof body === "object" &&
        "data" in body &&
        Boolean((body as { data?: { alreadyAttended?: boolean } }).data?.alreadyAttended);

      setCards((prev) =>
        prev.map((card) =>
          card.id === attendanceModalCardId ? { ...card, attended: true } : card,
        ),
      );
      toast.success(alreadyAttended ? "Already marked as attended." : "Attendance marked successfully.");
      closeAttendanceModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark attendance.");
    } finally {
      setMarkingAttendanceId(null);
    }
  };

  const openEdit = () => {
    if (!eventData) return;
    cancelCampaignDescriptionEdit();
    setEditForm({
      name: eventData.name || "",
      description: eventData.description || "",
      location: eventData.location_type === "webinar" ? "" : (eventData.location || ""),
      location_type: eventData.location_type || "onsite",
      date: eventData.date || "",
      time: eventData.time || "",
      logo: eventData.logo_url || "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || (!editForm.location && editForm.location_type === "onsite") || !editForm.date || !editForm.time) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (editForm.name.trim().length > EVENT_NAME_MAX_CHARS) {
      toast.error(`Campaign name can be up to ${EVENT_NAME_MAX_CHARS} characters.`);
      return;
    }
    if (editForm.date < minCampaignDate) {
      toast.error("Campaign date must be today or in the future.");
      return;
    }

    setIsSavingEdit(true);
    try {
      let logo_url = "";
      if (editForm.logo && editForm.logo.startsWith("data:")) {
        if (!userId) {
          throw new Error("You must be logged in to update campaign logo.");
        }
        const uploadRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: editForm.logo,
            folder: `events/${userId}`,
          }),
        });
        const uploadPayload = await readResponsePayload(uploadRes);
        const uploadedUrl =
          uploadPayload && typeof uploadPayload === "object" && "data" in uploadPayload
            ? (uploadPayload as { data?: { url?: unknown } }).data?.url
            : undefined;
        if (!uploadRes.ok || !uploadedUrl) {
          throw new Error(getPayloadError(uploadPayload, "Campaign logo upload failed."));
        }
        logo_url = String(uploadedUrl);
      } else if (typeof editForm.logo === "string") {
        logo_url = editForm.logo.trim();
      }

      const updateRes = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          location: editForm.location_type === "webinar" ? "Webinar" : editForm.location,
          location_type: editForm.location_type,
          date: editForm.date,
          time: editForm.time,
          logo_url,
        }),
      });
      const updatePayload = await readResponsePayload(updateRes);
      if (!updateRes.ok) throw new Error(getPayloadError(updatePayload, "Failed to update event."));

      setEventData((prev) => prev ? {
        ...prev,
        name: editForm.name,
        description: editForm.description,
        location: editForm.location_type === "webinar" ? "Webinar" : editForm.location,
        location_type: editForm.location_type,
        date: editForm.date,
        time: editForm.time,
        logo_url,
      } : prev);
      toast.success("Campaign updated.");
      cancelCampaignDescriptionEdit();
      router.refresh();
      setIsEditOpen(false);
    } catch (err) {
      logger.error({ err }, "Error updating event");
      toast.error("Failed to update campaign.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const cancelCampaignDescriptionEdit = () => {
    if (isSavingCampaignDescription) return;
    setIsEditingCampaignDescription(false);
    setCampaignDescriptionDraft("");
  };

  const saveCampaignDescription = async () => {
    if (!eventData || isPreviewMode || !canManageEvent || isSavingCampaignDescription) return;
    const next = campaignDescriptionDraft.trim();
    if (next.length > CAMPAIGN_DESCRIPTION_MAX_CHARS) {
      toast.error(`Description can be up to ${CAMPAIGN_DESCRIPTION_MAX_CHARS} characters.`);
      return;
    }
    setIsSavingCampaignDescription(true);
    try {
      const updateRes = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: next }),
      });
      const updatePayload = await readResponsePayload(updateRes);
      if (!updateRes.ok) throw new Error(getPayloadError(updatePayload, "Failed to update description."));
      setEventData((prev) => (prev ? { ...prev, description: next } : prev));
      setIsEditingCampaignDescription(false);
      setCampaignDescriptionDraft("");
      toast.success("Campaign description updated.");
      router.refresh();
    } catch (err) {
      logger.error({ err }, "Event page operation failed");
      toast.error("Failed to update description.");
    } finally {
      setIsSavingCampaignDescription(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!renewForm.date) {
      toast.error("Please provide a new date for the event.");
      return;
    }
    if (!renewForm.location.trim()) {
      toast.error("Please provide a new location for the event.");
      return;
    }
    const newDate = new Date(renewForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      toast.error("Renewal date must be today or in the future.");
      return;
    }

    setIsRenewing(true);
    try {
      if (!userId) {
        throw new Error("You must be logged in to renew an event.");
      }
      let logo_url = eventData?.logo_url || "";

      // Upload new logo
      if (renewForm.logo && renewForm.logo.startsWith('data:')) {
        const uploadRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: renewForm.logo,
            folder: `events/${userId}`,
          }),
        });
        const uploadPayload = await readResponsePayload(uploadRes);
        const uploadedUrl =
          uploadPayload && typeof uploadPayload === "object" && "data" in uploadPayload
            ? (uploadPayload as { data?: { url?: unknown } }).data?.url
            : undefined;
        if (!uploadRes.ok || !uploadedUrl) {
          throw new Error(getPayloadError(uploadPayload, "Logo upload failed."));
        }
        logo_url = String(uploadedUrl);
      }

      // Create a duplicate/renewed event in DB instead of updating the old one
      const insertPayload = {
        name: eventData?.name || "Renewed Event",
        description: eventData?.description || "",
        location: renewForm.location.trim(),
        location_type: eventData?.location_type || "onsite",
        date: renewForm.date,
        time: eventData?.time || "",
        logo_url: logo_url,
        user_id: userId,
        sponsors: eventData?.sponsors?.length ? eventData.sponsors : [],
        registration_form_config:
          eventData?.registration_form_config || getDefaultRegistrationFormConfig(),
        card_color: eventData?.card_color || "purple",
        card_font: eventData?.card_font || "inter",
        horizontal_text_color: eventData?.horizontal_text_color || "",
        vertical_text_color: eventData?.vertical_text_color || "",
        is_branding_finalized: Boolean(eventData?.is_branding_finalized),
      };
      const createRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...insertPayload,
          ownerId: userId,
        }),
      });
      const createPayload = await readResponsePayload(createRes);
      if (!createRes.ok) {
        throw new Error(getPayloadError(createPayload, "Database insert failed."));
      }
      const createdEventId =
        createPayload && typeof createPayload === "object" && "data" in createPayload
          ? (createPayload as { data?: { id?: unknown } }).data?.id
          : undefined;
      if (!createdEventId) {
        throw new Error("Insert failed: no data returned.");
      }

      toast.success(`Event renewed successfully! Redirecting...`);
      setIsRenewOpen(false);
      
      // Redirect to the newly created event
      router.refresh();
      router.push(`/dashboard/events/${String(createdEventId)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to renew event. Please try again.";
      logger.error({ err }, "Renewal error");
      toast.error(message);
    } finally {
      setIsRenewing(false);
    }
  };

  const handleDuplicate = async () => {
    if (!eventData) return;
    setIsDuplicating(true);
    try {
      if (!userId) {
        toast.error("You need to be signed in to duplicate.");
        return;
      }
      const duplicateRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${eventData.name} (Copy)`,
          description: eventData.description || "",
          location: eventData.location,
          location_type: eventData.location_type || "onsite",
          date: eventData.date,
          time: eventData.time || "",
          logo_url: eventData.logo_url || "",
          sponsors: eventData.sponsors?.length ? eventData.sponsors : [],
          registration_form_config:
            eventData.registration_form_config || getDefaultRegistrationFormConfig(),
          card_color: eventData.card_color || "purple",
          card_font: eventData.card_font || "inter",
          horizontal_text_color: eventData.horizontal_text_color || "",
          vertical_text_color: eventData.vertical_text_color || "",
          is_branding_finalized: Boolean(eventData.is_branding_finalized),
          ownerId: userId,
        }),
      });
      const duplicatePayload = await readResponsePayload(duplicateRes);
      if (!duplicateRes.ok) throw new Error(getPayloadError(duplicatePayload, "Failed to duplicate event."));
      const createdId =
        duplicatePayload && typeof duplicatePayload === "object" && "data" in duplicatePayload
          ? (duplicatePayload as { data?: { id?: unknown } }).data?.id
          : undefined;

      toast.success("Event duplicated.");
      if (createdId) {
        router.refresh();
        router.push(`/dashboard/events/${String(createdId)}`);
      }
    } catch (err) {
      logger.error({ err }, "Error duplicating event");
      toast.error("Failed to duplicate event.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!isDeleteConfirmMatch(deleteConfirm, deleteConfirmTarget)) {
      toast.error("Event name does not match.");
      return;
    }
    setIsDeleting(true);
    try {
      // 1. Remove attendee photos from storage
      const photoPaths = cards
        .map((c) => c.photo_path)
        .filter((p): p is string => !!p);

      if (photoPaths.length > 0) {
        await Promise.all(
          photoPaths.map((url) =>
            fetch("/api/media/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            }),
          ),
        );
      }

      const deleteRes = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const deletePayload = await readResponsePayload(deleteRes);
      if (!deleteRes.ok) {
        throw new Error(getPayloadError(deletePayload, "Could not delete event."));
      }

      toast.success("Event deleted permanently.");
      router.refresh();
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete event.";
      logger.error({ err }, "Error deleting event");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openSponsorsModal = () => {
    const rows = eventData?.sponsors?.map((s) => ({ name: s.name, logo: s.logo_url })) ?? [];
    setSponsorRows(rows);
    setIsSponsorsOpen(true);
  };

  const handleSaveSponsors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData || isPreviewMode) return;
    setIsSavingSponsors(true);
    try {
      if (!userId) throw new Error("Not signed in");
      const resolved = await resolveSponsorRowsToEntries(userId, id, sponsorRows);
      const saveRes = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsors: resolved }),
      });
      const savePayload = await readResponsePayload(saveRes);
      if (!saveRes.ok) throw new Error(getPayloadError(savePayload, "Failed to save sponsors."));
      setEventData((prev) => (prev ? { ...prev, sponsors: resolved } : prev));
      toast.success("Sponsors saved.");
      setIsSponsorsOpen(false);
      router.refresh();
    } catch (err) {
      logger.error({ err }, "Event page operation failed");
      toast.error("Could not save sponsors. Check your connection and try again.");
    } finally {
      setIsSavingSponsors(false);
    }
  };

  const openRegistrationFormModal = (role: "guest" | "visitor") => {
    setFormBuilderRole(role);
    setEditingCustomFieldId(null);
    setNewFieldLabel("");
    setNewFieldType("text");
    setRegistrationFormDraft(
      normalizeRegistrationFormConfig(
        eventData?.registration_form_config || getDefaultRegistrationFormConfig(),
      ),
    );
    setIsRegistrationFormOpen(true);
  };

  const updateDraftFields = (
    role: "guest" | "visitor",
    updater: (fields: RegistrationFieldDefinition[]) => RegistrationFieldDefinition[],
  ) => {
    setRegistrationFormDraft((prev) => ({ ...prev, [role]: updater(prev[role]) }));
  };

  const saveRegistrationFormConfig = async () => {
    if (!eventData || isPreviewMode) return;
    setIsSavingRegistrationForm(true);
    try {
      const normalized = normalizeRegistrationFormConfig(registrationFormDraft);
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_form_config: normalized }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.error || "Could not save registration form.");
        return;
      }
      setEventData((prev) => (prev ? { ...prev, registration_form_config: normalized } : prev));
      toast.success("Registration form settings saved.");
      setIsRegistrationFormOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not save registration form.");
    } finally {
      setIsSavingRegistrationForm(false);
    }
  };

  const saveBrandingConfig = async () => {
    if (!eventData || isPreviewMode) return;
    setIsSavingBranding(true);
    try {
      const payload = {
        card_color: brandingDraft.card_color || "purple",
        card_font: brandingDraft.card_font || "inter",
        horizontal_text_color: brandingDraft.horizontal_text_color.trim(),
        vertical_text_color: brandingDraft.vertical_text_color.trim(),
        is_branding_finalized: true,
      };
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error || "Could not save card branding.");
        return;
      }
      setEventData((prev) => (prev ? { ...prev, ...payload, is_branding_finalized: true } : prev));
      toast.success("Card branding saved.");
      setIsBrandingOpen(false);
      router.refresh();
    } catch (err) {
      logger.error({ err }, "Branding save error");
      toast.error("Could not save card branding.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const addCustomFieldToDraft = () => {
    const label = newFieldLabel.trim();
    if (!label) {
      toast.error("Field label is required.");
      return;
    }
    if (editingCustomFieldId) {
      updateDraftFields(formBuilderRole, (fields) =>
        fields.map((field) =>
          field.id === editingCustomFieldId
            ? {
                ...field,
                label,
                inputType: newFieldType,
                placeholder: label,
              }
            : field,
        ),
      );
      setEditingCustomFieldId(null);
      setNewFieldLabel("");
      setNewFieldType("text");
      return;
    }
    const idBase = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
    const fieldId = `${idBase}_${Date.now().toString().slice(-5)}`;
    updateDraftFields(formBuilderRole, (fields) => [
      ...fields,
      {
        id: fieldId,
        label,
        inputType: newFieldType,
        required: false,
        enabled: true,
        placeholder: label,
      },
    ]);
    setNewFieldLabel("");
    setNewFieldType("text");
  };
  const startEditCustomField = (field: RegistrationFieldDefinition) => {
    setEditingCustomFieldId(field.id);
    setNewFieldLabel(field.label);
    if (field.inputType === "number" || field.inputType === "url" || field.inputType === "text") {
      setNewFieldType(field.inputType);
    } else {
      setNewFieldType("text");
    }
  };

  const csvCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const stringValue =
      typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csvFilenamePart = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  };

  const normalizeLinkedInUrl = (value?: string) => {
    const linkedIn = String(value || "").trim();
    if (!linkedIn) return "";
    if (/^https?:\/\//i.test(linkedIn)) return linkedIn;
    return `https://linkedin.com/in/${linkedIn.replace(/^\/+|^in\//i, "")}`;
  };

  const handleExport = () => {
    if (cards.length === 0) return;

    const customFieldKeys = Array.from(
      new Set(
        cards.flatMap((card) =>
          Object.keys(card.customFields || {}).filter((key) => !key.startsWith("__")),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));

    // Build a key → label map from the registration form so column headers
    // match exactly what the attendee saw on the form.
    const allFormFields = [
      ...effectiveRegistrationConfig.guest,
      ...effectiveRegistrationConfig.visitor,
    ];
    const fieldLabelMap = new Map(allFormFields.map((f) => [f.id, f.label]));

    const headers = [
      "Name",
      "Role",
      "Company",
      "Email",
      "Attendee Type",
      "QR Code Link",
      "Attended",
      ...customFieldKeys.map((key) => fieldLabelMap.get(key) ?? key),
    ];
    const rows = cards.map((card) => [
      card.name,
      card.role,
      card.company,
      card.email,
      String(card.track || "").trim().toLowerCase() === "guest" ? "Guest" : "Visitor",
      normalizeLinkedInUrl(card.linkedin),
      card.attended ? "Yes" : "No",
      ...customFieldKeys.map((key) => card.customFields?.[key] ?? ""),
    ]);

    const csvContent = [
      headers.map(csvCell).join(","),
      ...rows.map(row => row.map(csvCell).join(",")),
    ].join("\r\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${csvFilenamePart(eventData?.name || "") || `campaign-${eventData?.id || id}`}-attendees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitAccessRequest = async (requestedAction: string, note?: string) => {
    if (!eventData?.id) return;
    const trimmedNote = String(note || "").trim();
    if (!trimmedNote) {
      toast.error("Please provide a short reason for this access request.");
      return;
    }
    setIsSubmittingAccessRequest(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventData.id,
          requestedAction,
          note: trimmedNote,
        }),
      });
      const payload = await readResponsePayload(res);
      if (!res.ok) {
        toast.error(getPayloadError(payload, "Could not create access request."));
        return;
      }
      toast.success("Access request sent to organization admin.");
      setIsAccessRequestOpen(false);
      setAccessRequestNote("");
      setAccessRequestAction("manage_event");
    } catch (err) {
      logger.error({ err }, "Access request error");
      toast.error("Could not create access request.");
    } finally {
      setIsSubmittingAccessRequest(false);
    }
  };

  useOrgRegistrationStream(id, canReviewRegistrations && !isPreviewMode, {
    onNew: (payload) => {
      if (payload.request) {
        setPendingRegistrations((prev) => {
          if (prev.some((r) => r.id === payload.request!.id)) return prev;
          return [payload.request!, ...prev];
        });
      }
      if (typeof payload.pendingCount === "number") {
        setPendingRegistrationCount(payload.pendingCount);
      }
    },
    onPendingCountUpdated: (count) => {
      setPendingRegistrationCount(count);
    },
    onUpdated: (payload) => {
      if (payload.status && payload.status !== "PENDING") {
        setPendingRegistrations((prev) => prev.filter((r) => r.id !== payload.requestId));
      }
      if (typeof payload.pendingCount === "number") {
        setPendingRegistrationCount(payload.pendingCount);
      }
    },
  });

  const reviewRegistrationRequest = async (requestId: string, decision: "approve" | "reject", reason?: string) => {
    if (decision === "reject" && !String(reason || "").trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    setReviewingRegistrationId(requestId);
    try {
      const res = await fetch(`/api/registration-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === "reject" ? String(reason || "").trim() : undefined,
        }),
      });
      const payload = await readResponsePayload(res);
      if (!res.ok) {
        toast.error(getPayloadError(payload, "Could not review registration."));
        return;
      }
      setPendingRegistrations((prev) => prev.filter((r) => r.id !== requestId));
      setPendingRegistrationCount((prev) => Math.max(0, prev - 1));
      setRejectingRegistrationId(null);
      setRegistrationRejectionReason("");
      if (decision === "approve") {
        toast.success("Registration approved. Attendee card created.");
        triggerRefresh();
      } else {
        toast.success("Registration rejected.");
      }
    } catch (err) {
      logger.error({ err }, "Review registration error");
      toast.error("Could not review registration.");
    } finally {
      setReviewingRegistrationId((current) => (current === requestId ? null : current));
    }
  };

  const reviewAccessRequest = async (requestId: string, decision: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/access-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await readResponsePayload(res);
      if (!res.ok) {
        toast.error(getPayloadError(payload, "Could not review request."));
        return;
      }
      setPendingAccessRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(decision === "approve" ? "Access granted." : "Access request rejected.");
    } catch (err) {
      logger.error({ err }, "Review access request error");
      toast.error("Could not review request.");
    }
  };

  const loadActiveGrants = async () => {
    if (!eventData?.id) return;
    setIsLoadingGrants(true);
    try {
      const res = await fetch(`/api/access-grants?eventId=${eventData.id}`);
      const payload = await readResponsePayload(res);
      if (!res.ok) {
        toast.error(getPayloadError(payload, "Could not load active grants."));
        return;
      }
      setActiveGrants((payload as { data?: ActiveGrant[] })?.data || []);
    } catch (err) {
      logger.error({ err }, "Load grants error");
      toast.error("Could not load active grants.");
    } finally {
      setIsLoadingGrants(false);
    }
  };

  const revokeGrant = async (grantId: string) => {
    setRevokingGrantId(grantId);
    try {
      const res = await fetch(`/api/access-grants/${grantId}`, { method: "DELETE" });
      const payload = await readResponsePayload(res);
      if (!res.ok) {
        toast.error(getPayloadError(payload, "Could not revoke grant."));
        return;
      }
      setActiveGrants((prev) => prev.filter((g) => g.id !== grantId));
      toast.success("Access revoked.");
    } catch (err) {
      logger.error({ err }, "Revoke grant error");
      toast.error("Could not revoke grant.");
    } finally {
      setRevokingGrantId((current) => (current === grantId ? null : current));
    }
  };

  const openShareActions = (url: string, role: "guest" | "visitor") => {
    const message = `We are hosting ${eventData?.name || "our event"}. Register here: ${url}`;
    setShareDraftUrl(url);
    setShareDraftMessage(message);
    setShareDraftRole(role);
    setIsShareActionsOpen(true);
  };

  const renderCampaignDescriptionSection = (): ReactNode => {
    if (!eventData || isPreviewMode) return null;
    const trimmed = String(eventData.description || "").trim();
    const singleLinePreview = trimmed ? String(eventData.description || "").replace(/\s+/g, " ").trim() : "";
    const canEditInline = canManageEvent;
    const showComposer = Boolean(canEditInline && isEditingCampaignDescription);

    return (
      <section
        aria-label="Campaign description"
        className="mt-4 w-full min-w-0 text-left sm:mt-5"
      >
        <div
          className="w-full rounded-sm border bg-white border border-hairline-soft px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] backdrop-blur-xl backdrop-saturate-150 sm:px-4 sm:py-2.5"
          style={{ borderColor: "rgba(107, 114, 128, 0.7)" }}
        >
          {showComposer ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={campaignDescriptionDraft}
                onChange={(e) => setCampaignDescriptionDraft(e.target.value)}
                maxLength={CAMPAIGN_DESCRIPTION_MAX_CHARS}
                rows={4}
                className="w-full min-h-[100px] resize-y rounded-md border border-border/60 bg-white/95 px-3 py-2.5 text-sm leading-relaxed text-heading outline-none shadow-sm focus:ring-2 focus:ring-primary/30"
                placeholder="Add a short overview for clients and teammates…"
                aria-label="Campaign description"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted">
                  {campaignDescriptionDraft.length}/{CAMPAIGN_DESCRIPTION_MAX_CHARS}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelCampaignDescriptionEdit}
                    disabled={isSavingCampaignDescription}
                    className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-muted transition-all duration-150 hover:bg-surface-strong/80 hover:text-heading disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveCampaignDescription()}
                    disabled={isSavingCampaignDescription}
                    className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingCampaignDescription ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-center gap-3">
              <p
                className="m-0 min-w-0 flex-1 truncate text-sm leading-normal text-heading/80"
                title={trimmed ? String(eventData.description || "") : undefined}
              >
                {trimmed ? (
                  singleLinePreview
                ) : (
                  <span className="text-muted italic font-normal">
                    No campaign description added yet.
                  </span>
                )}
              </p>
              {canEditInline && (
                <button
                  type="button"
                  onClick={() => {
                    setCampaignDescriptionDraft(String(eventData.description || ""));
                    setIsEditingCampaignDescription(true);
                  }}
                  className="inline-flex shrink-0 flex-col items-center gap-1 rounded-md p-1.5 text-muted/70 transition-colors duration-150 hover:bg-primary/[0.07] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:opacity-60"
                  aria-label="Edit campaign description"
                  title="Edit campaign description"
                >
                  <Pencil size={14} className="shrink-0" />
                  <span className="h-[2px] w-5 shrink-0 bg-muted/80" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  const isDeleteConfirmValid = isDeleteConfirmMatch(deleteConfirm, deleteConfirmTarget);

  if (isLoading) {
    return (
      <main className={`${dashboardMainTransparent} flex flex-col items-center`}>
        <GradientBackground />
        <div className={dashboardContentInset}>
          <div className="flex flex-col gap-6 mb-12">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-64 h-12" />
            <div className="flex gap-4">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-32 h-6" />
            </div>
          </div>

          <Skeleton className="w-full h-32 rounded-md mb-10" />
          <Skeleton className="w-full h-14 rounded-sm mb-8" />

          <div className="flex flex-col gap-4">
            <Skeleton className="w-full h-24 rounded-sm" />
            <Skeleton className="w-full h-24 rounded-sm" />
            <Skeleton className="w-full h-24 rounded-sm" />
          </div>
        </div>
      </main>
    );
  }

  if (!eventData) {
    return (
      <main className={dashboardMainWhiteCenter}>
        <GradientBackground />
        <div className="relative z-10 text-xl font-semibold tracking-[-0.03em] leading-[1.15] text-heading">Campaign not found</div>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "secondary" }), "relative z-10")}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className={dashboardMainTransparent}>
      {isPreviewMode && (
        <div className={dashboardPreviewBannerOuter}>
          <div className={dashboardPreviewBannerInner}>
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
              <Sparkles size={18} className="shrink-0 text-primary" />
              <span className="min-w-0 leading-snug">Super Admin Inspection Mode &mdash; Event View</span>
            </div>
            <Link
              href="/admin"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 self-start rounded-sm border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:border-white/40 hover:bg-white/20 active:scale-95 sm:self-auto")}
            >
              <ArrowLeft size={14} />
              Exit Preview
            </Link>
          </div>
        </div>
      )}
      <GradientBackground />

      <div className={dashboardContentInset}>
        {/* Header row */}
        <motion.div className="relative z-30 mb-7 sm:mb-9" viewport={presets.viewport} {...fadeUp(0.02)}>
          <ShadButton
            type="button"
            onClick={() => {
              router.refresh();
              if (isPreviewMode) {
                const target = eventData?.user ? `/dashboard?impersonate=${encodeURIComponent(eventData.user)}` : "/admin";
                router.push(target);
                return;
              }
              router.push("/dashboard");
            }}
            variant="ghost"
            className="h-auto gap-2.5 px-0 text-base font-semibold text-heading hover:bg-transparent hover:text-ink hover:underline rounded-inline mb-1.5 group -ml-1 sm:-ml-2 py-1"
          >
            <motion.span {...hoverIconNudge(-2)} className="inline-flex">
              <ArrowLeft size={16} className="transition-transform" />
            </motion.span>
            {isPreviewMode ? "Back to Organization View" : "Back to Dashboard"}
          </ShadButton>
          <span className="block text-sm font-normal tracking-[0.01em] leading-tight text-muted/70 mb-4">
            Campaign details
          </span>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 lg:gap-10">
          <div className="min-w-0 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-heading tracking-tight leading-[1.1]"
                style={{ fontWeight: 700 }}
              >
                {eventData.name}
              </h1>
              <Badge variant="outline" className={`inline-flex shrink-0 text-[13px] font-medium tracking-[0.01em] leading-tight px-3 py-1 rounded-md border ${status.classes}`}>
                {status.label}
              </Badge>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1 text-sm text-muted font-medium">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar size={16} className="text-muted/70 shrink-0" />
                <span className="tabular-nums">{eventData.date}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                {(eventData.location_type === "webinar" || (eventData.location || "").trim().toLowerCase() === "webinar") ? (
                  <Globe size={16} className="text-muted/70 shrink-0" />
                ) : (
                  <MapPin size={16} className="text-muted/70 shrink-0" />
                )}
                <span className="min-w-0 truncate">{eventData.location}</span>
              </div>
            </div>
            {isTeamMemberEventMode && (
              <p className="mt-2 text-sm text-heading/75">
                Team execution mode: you can work inside granted permissions for this campaign.
              </p>
            )}
          </div>

          <div className="flex min-w-0 w-full flex-wrap items-center gap-x-2 gap-y-2 lg:ml-auto lg:max-w-[min(100%,44rem)] lg:justify-end relative z-20 shrink-0">
            {!isPreviewMode && (
              <>
                <div className="relative" ref={shareRef}>
                  <ShadButton
                    variant="secondary"
                    onClick={() => {
                      if (!isBrandingFinalized) {
                        toast.error("Please save card branding before sharing registration links.");
                        return;
                      }
                      setIsShareOpen(!isShareOpen);
                    }}
                    disabled={!isBrandingFinalized}
                    className={`transition-all duration-150 ${isShareOpen ? "border-primary/55 bg-primary/15 text-primary-strong" : ""} ${!isBrandingFinalized ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
                  >
                    <LinkIcon size={18} />
                    Share Link
                  </ShadButton>

                  {isShareOpen && (
                    <Card className="absolute left-1/2 right-auto top-full z-9999 mt-3 w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border-border bg-white py-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] animate-in fade-in slide-in-from-top-2 duration-200 sm:left-auto sm:right-0 sm:w-56 sm:max-w-none sm:translate-x-0">
                      <div className="px-4 py-2 mb-1 border-b border-border/40">
                        <span className="text-[13px] font-medium text-muted/50 uppercase tracking-[0.01em] leading-tight">Share Options</span>
                      </div>
                      
                      <ShadButton
                        variant="ghost"
                        onClick={() => {
                          setIsShareOpen(false);
                          setGuestCategoryInput("");
                          setGuestCategoryError("");
                          setIsGuestCategoryOpen(true);
                        }}
                        className="h-auto w-full justify-start gap-3 px-4 py-2 text-left hover:bg-surface group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-strong group-hover:scale-110 transition-transform">
                          <User size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-heading leading-tight">Guest</span>
                        </div>
                      </ShadButton>

                      <ShadButton
                        variant="ghost"
                        onClick={async () => {
                          const longUrl = `${window.location.origin}/r/${eventData.short_id || eventData.id}?r=v`;
                          const url = await toCompactShareUrl(longUrl);
                          setIsShareOpen(false);
                          openShareActions(url, "visitor");
                        }}
                        className="h-auto w-full justify-start gap-3 px-4 py-2 text-left hover:bg-surface group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-strong/10 bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                          <User size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-heading leading-tight">Visitor</span>
                        </div>
                      </ShadButton>
                    </Card>
                  )}
                </div>

                <ShadButton
                  variant="secondary"
                  onClick={() => {
                    if (!canManageEvent) return;
                    setBrandingDraft({
                      card_color: String(eventData?.card_color || "purple"),
                      card_font: String(eventData?.card_font || "inter"),
                      horizontal_text_color: String(eventData?.horizontal_text_color || ""),
                      vertical_text_color: String(eventData?.vertical_text_color || ""),
                    });
                    setBrandingUndoStack([]);
                    setBrandingRedoStack([]);
                    setIsBrandingOpen(true);
                  }}
                  disabled={!canManageEvent}
                  className={!canManageEvent ? "opacity-50 cursor-not-allowed grayscale" : ""}
                >
                  <Layers3 size={16} />
                  Card Branding
                </ShadButton>
                {status.label === "Past" ? (
                  <ShadButton 
                    onClick={() => {
                      if (!canManageEvent) {
                        setAccessRequestAction("manage_event");
                        setIsAccessRequestOpen(true);
                        return;
                      }
                      setRenewForm({ location: eventData.location || "", date: "", logo: "" });
                      setIsRenewOpen(true);
                    }} 
                    disabled={!canManageEvent}
                    className={`shadow-lg shadow-black/10 animate-pulse-subtle ${!canManageEvent ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
                  >
                    <RefreshCw size={16} />
                    Renew Event
                  </ShadButton>
                ) : (
                  <ShadButton
                    variant="secondary"
                    onClick={() => (canManageEvent ? openEdit() : undefined)}
                    disabled={!canManageEvent}
                    className={
                      !canManageEvent
                        ? "opacity-50 cursor-not-allowed grayscale"
                        : "transition-shadow duration-200 hover:shadow-md hover:border-primary/50 hover:bg-primary/9"
                    }
                  >
                    <Pencil size={16} />
                    Edit
                  </ShadButton>
                )}
                <ShadButton
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/events/${eventData.id}/promotions`)}
                  className="transition-shadow duration-200 hover:shadow-md hover:border-primary/50 hover:bg-primary/9 border-primary/30 text-primary hover:text-primary-strong cursor-pointer"
                >
                  <Megaphone size={16} />
                  Promotion
                </ShadButton>
                <ShadButton
                  variant="secondary"
                  onClick={() => (canManageEvent ? openSponsorsModal() : undefined)}
                  disabled={!canManageEvent}
                  className={!canManageEvent ? "opacity-50 cursor-not-allowed grayscale" : ""}
                >
                  <Handshake size={16} />
                  Sponsors
                </ShadButton>
                <ShadButton
                  variant="secondary"
                  onClick={() => (canManageEvent ? handleDuplicate() : undefined)}
                  disabled={isDuplicating || !canManageEvent}
                  className={!canManageEvent ? "opacity-50 cursor-not-allowed grayscale" : ""}
                >
                  <Copy size={16} />
                  {isDuplicating ? "..." : "Duplicate"}
                </ShadButton>
                <ShadButton
                  variant="secondary"
                  onClick={() => {
                    if (!canDeleteEvent) return;
                    setDeleteConfirm("");
                    setDeleteConfirmTarget(normalizeDeleteConfirmText(eventData?.name ?? ""));
                    setIsDeleteOpen(true);
                  }}
                  disabled={!canDeleteEvent}
                  className={`text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 ${
                    !canDeleteEvent
                      ? "cursor-not-allowed disabled:opacity-70 disabled:text-red-400 disabled:border-red-200/55 disabled:hover:bg-transparent disabled:hover:text-red-400 disabled:hover:border-red-200/55"
                      : ""
                  }`}
                >
                  <Trash2 size={16} />
                  Delete
                </ShadButton>
                {!canManageEvent && !canDeleteEvent && (
                  <ShadButton
                    variant="secondary"
                    onClick={() => {
                      setAccessRequestAction("delete_event");
                      setIsAccessRequestOpen(true);
                    }}
                  >
                    Take Access
                  </ShadButton>
                )}
                {canReviewRegistrations && (
                  <ShadButton variant="secondary" onClick={() => setIsRegistrationInboxOpen(true)}>
                    Pending Registrations ({pendingRegistrationCount})
                  </ShadButton>
                )}
                {canReviewAccessRequests && pendingAccessRequests.length > 0 && (
                  <ShadButton variant="secondary" onClick={() => setIsAccessInboxOpen(true)}>
                    Requests ({pendingAccessRequests.length})
                  </ShadButton>
                )}
                {isEventOwner && (
                  <ShadButton
                    variant="secondary"
                    onClick={async () => {
                      setIsAccessControlOpen(true);
                      await loadActiveGrants();
                    }}
                  >
                    Access Control
                  </ShadButton>
                )}
              </>
            )}
          </div>
          </div>
          {renderCampaignDescriptionSection()}
        </motion.div>
        {!isPreviewMode && !isBrandingFinalized && (
          <Alert className="mb-6 border-amber-300/50 bg-amber-50 text-amber-800">
            <AlertDescription>
              Please save card branding first, then you can use <span className="font-semibold">Share Link</span> for Guest/Visitor registrations.
            </AlertDescription>
          </Alert>
        )}

        {isPreviewMode && (
          <Card className="motion-token-enter relative mb-8 overflow-hidden rounded-xl border-hairline-soft bg-white p-5 shadow-xl">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-primary-strong">Security Oversight Active</span>
                  </div>
                  <h2 className="ui-section-heading">Platform Audit Layer</h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="inline-flex items-center gap-1 rounded-sm border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary-strong">
                    <ShieldCheck size={11} /> Super Admin
                  </Badge>
                  <Badge variant="outline" className="inline-flex items-center gap-1 rounded-sm border-amber-300/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                    <Activity size={11} /> View Only
                  </Badge>
                  <Badge variant="outline" className="inline-flex items-center gap-1 rounded-sm border-danger/20 bg-danger/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-danger">
                    <Lock size={11} /> Immutable Mode
                  </Badge>
                </div>
              </div>

              <p className="pt-1 text-sm font-normal text-slate-600 leading-relaxed">
                This campaign is currently locked for <span className="text-heading font-semibold">Administrative Inspection</span>. You have high-level visibility over all engagement metrics and lead data, but record modification and deletion are restricted to maintain audit integrity.
              </p>


            </div>
          </Card>
        )}
        {isOrgAdminEventMode && (
          <motion.div
            className="mb-8 w-full max-w-full min-w-0 box-border motion-token-enter motion-token-hover overflow-x-auto"
            viewport={presets.viewport}
            {...fadeUp(0.04)}
            {...hoverLift(-2, 1.004)}
          >
            <Card className="rounded-sm border-primary/25 bg-surface px-4 py-4 shadow-sm sm:px-5">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Badge variant="outline" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-primary/25 bg-primary/12 p-0 text-primary-strong">
                    <Activity size={20} />
                  </Badge>
                  <div className="min-w-0 flex flex-col">
                    <span className="break-words text-2xl sm:text-[30px] font-bold tracking-[-0.02em] text-primary-strong leading-tight wrap-break-word">
                      Campaign Management Console
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                <motion.div
                  className="motion-token-enter motion-token-hover"
                  viewport={presets.viewport}
                  {...fadeUp(0.06)}
                  {...hoverLift(-2, 1.005)}
                >
                  <Card className="rounded-sm border-primary/20 bg-white/85 px-4 py-3">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-heading/75">
                    <Layers3 size={13} className="text-primary-strong" />
                    Leads Composition
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Guests",   value: ownerGuestCount,           bg: "bg-primary/10", border: "border-primary/20", text: "text-primary-strong" },
                      { label: "Visitors", value: ownerVisitorCount,         bg: "bg-info/10",    border: "border-info/20",    text: "text-info" },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.label}
                        className={`flex flex-col items-center justify-center gap-1 rounded-md border py-3 px-2 ${item.bg} ${item.border}`}
                        viewport={presets.viewport}
                        {...staggerItem(idx, 0.04, 0.18, 8, 0.24)}
                      >
                        <span className="text-2xl font-semibold text-heading tracking-[-0.02em] leading-none">
                          {item.value}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${item.text} text-center leading-tight mt-1`}>
                          {item.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  </Card>
                </motion.div>

                <motion.div
                  className="motion-token-enter motion-token-hover"
                  viewport={presets.viewport}
                  {...fadeUp(0.08)}
                  {...hoverLift(-2, 1.005)}
                >
                  <Card className="rounded-sm border-primary/20 bg-white/85 px-4 py-3">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-heading/75">
                    <TrendingUp size={13} className="text-primary-strong" />
                    Top Roles
                  </p>
                  <div className="space-y-2">
                    {ownerTopRoles.length === 0 ? (
                      <p className="text-sm text-muted">No lead roles yet.</p>
                    ) : (
                      ownerTopRoles.slice(0, 3).map((entry, roleIdx) => (
                        <motion.div
                          key={entry.role}
                          className="flex items-center justify-between rounded-md border border-border/60 bg-white/60 p-2.5 transition-colors hover:bg-white"
                          viewport={presets.viewport}
                          {...staggerItem(roleIdx, 0.04, 0.2, 8, 0.24)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary-strong">
                              {roleIdx + 1}
                            </span>
                            <span className="truncate text-sm font-medium text-heading">
                              {entry.role}
                            </span>
                          </div>
                          <Badge variant="outline" className="rounded-full border-transparent bg-heading/5 px-2.5 py-0.5 text-xs font-semibold text-heading/80">
                            {entry.count}
                          </Badge>
                        </motion.div>
                      ))
                    )}
                  </div>
                  </Card>
                </motion.div>
              </div>
            </div>
            </Card>
          </motion.div>
        )}
        {isTeamMemberEventMode && (
          <motion.div
            className="mb-8 rounded-sm border border-primary/25 bg-surface border border-hairline-soft px-5 py-4 shadow-sm motion-token-enter motion-token-hover"
            viewport={presets.viewport}
            {...fadeUp(0.05)}
            {...hoverLift(-2, 1.004)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="inline-flex items-center rounded-md border-primary/25 bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-strong">
                Team Member View
              </Badge>
              <Badge variant="outline" className="inline-flex items-center rounded-md border-border/70 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-heading/80">
                Campaign Access
              </Badge>
              <Badge
                variant="outline"
                className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  canManageEvent
                    ? "border-primary/25 bg-primary/10 text-primary-strong"
                    : "border-amber-300/70 bg-amber-50 text-amber-700"
                }`}
              >
                {canManageEvent ? "Manage enabled" : "Restricted mode"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">
              Card operations and campaign actions are shown based on your granted permissions.
            </p>
          </motion.div>
        )}

        {!isPreviewMode && (
          <motion.div
            className="mb-8 rounded-md border border-primary/20 bg-white/90 px-6 py-6 shadow-sm"
            viewport={presets.viewport}
            {...fadeUp(0.08)}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-heading tracking-[-0.02em]">Registration Form Preview</h3>
                  <p className="text-sm text-muted mt-1">
                    Click preview form to open preview & edit controls.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-md border-border/60 bg-white p-4.5 flex flex-col">
                  <p className="text-[22px] font-semibold text-heading leading-tight">Guest Form</p>
                  <p className="mt-1 text-sm text-muted">Preview and customize guest registration fields.</p>
                  <ShadButton
                    variant="secondary"
                    size="sm"
                    className="mt-4 !h-11 w-fit shrink-0 px-5 text-base"
                    disabled={!canManageEvent}
                    onClick={() => openRegistrationFormModal("guest")}
                    >
                    Preview Form
                  </ShadButton>
                  {!canManageEvent && (
                    <p className="text-[11px] text-muted mt-2">You need campaign manage access to edit fields.</p>
                  )}
                  <p className="mt-2 text-sm text-muted">{previewGuestFields.length} fields configured</p>
                </Card>
                <Card className="rounded-md border-border/60 bg-white p-4.5 flex flex-col">
                  <p className="text-[22px] font-semibold text-heading leading-tight">Visitor Form</p>
                  <p className="mt-1 text-sm text-muted">Preview and customize visitor registration fields.</p>
                  <ShadButton
                    variant="secondary"
                    size="sm"
                    className="mt-4 !h-11 w-fit shrink-0 px-5 text-base"
                    disabled={!canManageEvent}
                    onClick={() => openRegistrationFormModal("visitor")}
                  >
                    Preview Form
                  </ShadButton>
                  {!canManageEvent && (
                    <p className="text-[11px] text-muted mt-2">You need campaign manage access to edit fields.</p>
                  )}
                  <p className="mt-2 text-sm text-muted">{previewVisitorFields.length} fields configured</p>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Section */}
        {!isOrgAdminEventMode && !isPreviewMode && (
          <motion.div
            className={`relative overflow-hidden p-6 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-8 group transition-all duration-500 animate-slide-up ${
              isTeamMemberEventMode
                ? "bg-white border border-hairline-soft border border-primary/20 shadow-sm"
                : "bg-primary border border-white/10 shadow-md"
            }`}
            viewport={presets.viewport}
            {...fadeUp(0.06)}
          >
            <div className="relative z-10 flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md shadow-sm ${
                isTeamMemberEventMode
                  ? "bg-primary text-white shadow-black/10" 
                  : "border border-white/20 bg-white/10 text-primary"
              }`}>
                <Users size={28} />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className={`ui-meta ${
                    isTeamMemberEventMode ? "text-primary-strong" : "text-primary/80"
                  }`}>Live Engagement</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-medium tracking-[-0.01em] leading-[1.02] ${
                    isTeamMemberEventMode ? "text-heading" : "text-white"
                  }`}>
                    <AnimatedCounter value={cards.length} />
                  </span>
                  <span className={`text-lg font-black uppercase tracking-wide ${
                    isTeamMemberEventMode ? "text-primary-strong" : "text-white/40"
                  }`}>Leads</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap justify-center md:justify-end items-center gap-4">
              {cards.length > 0 && (
                <ShadButton
                  variant={isTeamMemberEventMode ? "secondary" : "default"}
                  onClick={handleExport}
                  disabled={!canExport}
                  className={`rounded-md shadow-sm transition-all duration-300 ${
                    isTeamMemberEventMode
                      ? "bg-white border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary-strong" 
                      : "bg-primary hover:bg-primary-strong text-white border-none shadow-primary/30"
                  } ${!canExport ? "opacity-50 grayscale" : " active:scale-95"}`}
                >
                  <Download size={20} />
                  Download CSV
                </ShadButton>
              )}
            </div>
          </motion.div>
        )}

        {/* Search Bar */}
        <motion.div className="mb-4 flex min-w-0 flex-col gap-3 delay-200 sm:flex-row sm:items-center sm:gap-3" viewport={presets.viewport} {...fadeUp(0.1)}>
          <InputGroup
            className={`group h-10 w-full min-w-0 flex-1 rounded-md px-2.5 shadow-xs sm:h-10 ${
              isPreviewMode
                ? "border-primary/20 bg-white/90"
                : "border-border/60 bg-white/80 backdrop-blur-md"
            }`}
          >
            <InputGroupAddon className="p-0">
              <Search className="pointer-events-none shrink-0 text-muted/50 transition-colors group-focus-within:text-primary" size={18} strokeWidth={2.25} aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="event-attendees-search"
              name="eventAttendeesSearch"
              type="text"
              placeholder="Search leads in this campaign..."
              className="min-w-0 flex-1 text-sm font-medium text-heading placeholder:text-muted/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          {/* Mark Attendance Button */}
          {isEventOwner && !isPreviewMode && (
            <ShadButton
              variant={status.label === "Today" ? "default" : "outline"}
              size="lg"
              onClick={handleOpenMarkAttendanceScanner}
              disabled={status.label !== "Today"}
              title={status.label !== "Today" ? "Attendance can only be marked while the event is live." : "Scan attendance QR codes"}
              className={`w-full justify-center sm:w-auto gap-2 ${
                status.label !== "Today"
                  ? "cursor-not-allowed opacity-50 bg-gray-100 text-steel border-hairline"
                  : "bg-primary text-primary-foreground hover:bg-primary/95"
              }`}
            >
              <QrCode size={18} className="text-current" />
              <span>Mark Attendance</span>
              {status.label !== "Today" && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 ml-1">
                  Not Live
                </span>
              )}
            </ShadButton>
          )}

          {/* Download CSV Button */}
          {cards.length > 0 && (
            <ShadButton
              variant="outline"
              size="lg"
              onClick={handleExport}
              disabled={!canExport}
              title={!canExport ? "You do not have permission to export attendees" : "Download all attendee information as CSV"}
              className={`w-full justify-center sm:w-auto ${
                !canExport
                  ? "cursor-not-allowed opacity-50"
                  : "border-border bg-white text-heading hover:border-hairline-strong hover:bg-surface"
              }`}
            >
              <Download size={18} className={!canExport ? "text-muted/50" : "text-muted"} />
              <span>Download CSV</span>
            </ShadButton>
          )}
          
          {/* Filter Button and Dropdown */}
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <ShadButton
              variant={isFilterOpen || trackFilter !== "all" ? "secondary" : "outline"}
              size="lg"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full justify-center border-border bg-white text-heading hover:border-hairline-strong hover:bg-surface sm:w-auto"
            >
              <SlidersHorizontal size={18} className={isFilterOpen || trackFilter !== "all" ? "text-ink" : "text-muted"} />
              <span>Filter</span>
            </ShadButton>

            {isFilterOpen && (
              <Card className="absolute right-0 top-full z-[9999] mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border-gray-200 bg-white p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
  <div className="mb-4">
    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      LEAD TYPE
    </h4>

    <div className="flex flex-wrap gap-2">
      <ShadButton
        type="button"
        variant={trackFilter === "all" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTrackFilter("all")}
        className={trackFilter === "all" ? "border-primary/30 bg-primary/10 text-ink" : "bg-surface text-steel border-hairline hover:border-hairline-strong hover:text-ink"}
      >
        All
      </ShadButton>

      <ShadButton
        type="button"
        variant={trackFilter === "guest" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTrackFilter("guest")}
        className={trackFilter === "guest" ? "border-primary/30 bg-primary/10 text-ink" : "bg-surface text-steel border-hairline hover:border-hairline-strong hover:text-ink"}
      >
        Guest
      </ShadButton>

      <ShadButton
        type="button"
        variant={trackFilter === "visitor" ? "secondary" : "outline"}
        size="sm"
        onClick={() => setTrackFilter("visitor")}
        className={trackFilter === "visitor" ? "border-primary/30 bg-primary/10 text-ink" : "bg-surface text-steel border-hairline hover:border-hairline-strong hover:text-ink"}
      >
        Visitor
      </ShadButton>
    </div>
  </div>

  <ShadButton
    type="button"
    variant="link"
    size="sm"
    onClick={() => {
      setTrackFilter("all");
      setIsFilterOpen(false);
    }}
    className="ml-auto flex h-auto text-gray-500 hover:text-success"
  >
    Reset filters
  </ShadButton>
</Card>
            )}
          </div>
        </motion.div>

        {/* Cards list */}
        {cards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center text-center py-24 sm:py-32 bg-surface/30 border-dashed border-border rounded-xl gap-4 px-6 animate-slide-up delay-300">
            <div className="flex flex-col gap-1">
              <p className="text-heading font-medium text-lg">No leads yet</p>
              <p className="text-sm text-muted">Share the registration link to invite leads to register for this campaign.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 animate-slide-up delay-300">
            {filteredCards.length > 0 ? (
              filteredCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                className="group motion-token-enter motion-token-hover"
                viewport={presets.viewport}
                {...staggerItem(idx, 0.04, 0.24, 14, 0.28)}
                {...hoverLift(-2, 1.004)}
                >
                  <Card className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-visible p-5 sm:p-6 rounded-md  ${
                  isPreviewMode
                    ? "bg-white/90 border border-heading/15 shadow-md hover:shadow-lg hover:border-heading/30"
                    : isTeamMemberEventMode || isOrgAdminEventMode
                      ? "bg-white/95 border border-primary/20 shadow-md hover:shadow-lg hover:border-primary/35"
                    : "glass-panel hover:shadow-xl hover:shadow-black/5 hover:border-primary/30"
                }`}
                  >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20 overflow-hidden ring-offset-2 ring-primary/10 group-hover:ring-2 transition-all duration-500 transform group-hover:scale-105">
                        {card.photo ? (
                          <Image
                            src={card.photo}
                            alt={card.name}
                            width={56}
                            height={56}
                            sizes="56px"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={24} strokeWidth={1.5} className="text-primary-strong/40" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[11px] text-primary-foreground font-semibold border-2 border-white leading-[1.02] shadow-sm">
                        {card.name.charAt(0)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-heading group-hover:text-ink transition-colors truncate leading-tight">
                          {card.name}
                        </h3>
                        {(card.track === "guest" && card.guestCategory) && (
                          <Badge variant="outline" className="text-[14px] bg-primary/10 px-3 py-1 rounded-inline border-primary/20 text-primary-strong font-semibold tracking-[0em] leading-[1.2] shrink-0">
                            {card.guestCategory}
                          </Badge>
                        )}
                        {card.company && (
                          <Badge variant="outline" className="text-[14px] bg-primary/10 px-3 py-1 rounded-inline border-primary/20 text-primary-strong font-semibold tracking-[0em] leading-[1.2] shrink-0">
                            {card.company}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-inline border shrink-0 ${
                            card.attended
                              ? "bg-success/10 text-success border-success/25"
                              : "bg-surface text-steel border-hairline"
                          }`}
                        >
                          {card.attended ? "Attended" : "Not attended"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-medium leading-[1.5] text-heading/75">
                        <span className="flex items-center">{card.role}</span>
                        {card.email && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-heading/60">
                            • {card.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/cards/${card.id}${isPreviewMode && impersonateId ? `?impersonate=${encodeURIComponent(impersonateId)}` : ""}`}
                      className={cn(buttonVariants({ variant: "secondary" }), "shrink-0 rounded-md bg-white/60 border-white/60 transition-all duration-200 group-hover:border-primary/30 group-hover:text-ink")}
                    >
                      <motion.span {...hoverIconNudge(2)} className="inline-flex">
                        <ExternalLink size={14} />
                      </motion.span>
                      View
                    </Link>
                    {!isPreviewMode &&
                      (canEditCards ? (
                        <Link
                          href={`/cards/${card.id}/edit`}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0 rounded-sm bg-white/50 border-white/60")}
                        >
                          <Pencil size={14} />
                          Edit
                        </Link>
                      ) : (
                        <ShadButton
                          variant="secondary"
                          size="sm"
                          className="rounded-sm bg-white/50 border-white/60 opacity-50 cursor-not-allowed grayscale"
                          disabled
                          title="Request access to edit lead cards."
                        >
                          <Pencil size={14} />
                          Edit
                        </ShadButton>
                      ))}
                    {!isPreviewMode && (
                      <ShadButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (!canDeleteCards) return;
                          handleDelete(card.id);
                        }}
                        disabled={!canDeleteCards}
                        title={!canDeleteCards ? "Request access to delete lead cards." : "Delete lead card"}
                        className={`w-12 h-12 p-0 rounded-inline transition-all shrink-0 ${
                          canDeleteCards
                            ? "text-muted hover:text-red-500 hover:bg-red-50/50 hover:border-red-200"
                            : "text-muted/50 opacity-50 cursor-not-allowed grayscale"
                        }`}
                      >
                        <Trash2 size={16} />
                      </ShadButton>
                    )}
                    <div className="attendee-menu-container relative">
                      <ShadButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveMenuAttendeeId(activeMenuAttendeeId === card.id ? null : card.id);
                        }}
                        className="w-12 h-12 p-0 rounded-inline transition-all shrink-0 bg-white/50 border-white/60 hover:bg-surface"
                        title="More actions"
                      >
                        <MoreVertical size={16} />
                      </ShadButton>
                      {activeMenuAttendeeId === card.id && (
                        <Card className="absolute right-0 top-full z-[9999] mt-1 w-48 rounded-md border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-1 duration-100">
                          <ShadButton
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEmailModalAttendee(card);
                              setEmailSubject("");
                              setEmailBody("");
                              setIsEmailModalOpen(true);
                              setActiveMenuAttendeeId(null);
                            }}
                            className="flex h-auto w-full justify-start px-4 py-2 text-left text-sm text-heading hover:bg-surface transition-colors font-medium"
                          >
                            Send Custom Email
                          </ShadButton>
                        </Card>
                      )}
                    </div>

                  </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="text-center py-16 glass-panel rounded-xl border-dashed">
                <p className="text-muted font-medium">No results found for &ldquo;{searchQuery}&rdquo;</p>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={isAccessRequestOpen} onOpenChange={(open) => !open && !isSubmittingAccessRequest && setIsAccessRequestOpen(false)}>
        <DialogContent showCloseButton={false} className="w-full max-w-[440px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Take Access</DialogTitle>
                <DialogDescription className="text-sm text-muted">Request approval from organization admin to perform restricted actions.</DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => !isSubmittingAccessRequest && setIsAccessRequestOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <form
              className="px-6 pb-6 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitAccessRequest(accessRequestAction, accessRequestNote);
              }}
            >
              <Label className="text-[13px] font-normal tracking-[0.01em] leading-tight text-heading">Requested action</Label>
            <ShadSelect value={accessRequestAction} onValueChange={(value) => value && setAccessRequestAction(value)}>
                <SelectTrigger className="h-11 w-full border-border/60 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manage_event">Manage event settings</SelectItem>
                  <SelectItem value="delete_event">Delete event (only when leads = 0)</SelectItem>
                  <SelectItem value="edit_cards">Edit lead cards</SelectItem>
                  <SelectItem value="delete_cards">Delete lead cards</SelectItem>
                </SelectContent>
              </ShadSelect>
              <TextInput
                label="Reason"
                required
                placeholder="Explain what you need and why (1–2 sentences)."
                value={accessRequestNote}
                onChange={setAccessRequestNote}
              />
              <p className="text-xs text-muted -mt-1">
                Your organization admin will review this request and can approve or reject it.
              </p>
              <DialogFooter className="form-actions pt-1">
                <ShadButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAccessRequestOpen(false)}
                  disabled={isSubmittingAccessRequest}
                  className="order-2 w-full sm:order-1"
                >
                  Cancel
                </ShadButton>
                <ShadButton type="submit" disabled={isSubmittingAccessRequest} className="order-1 w-full sm:order-2">
                  {isSubmittingAccessRequest ? "Sending..." : "Request Access"}
                </ShadButton>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      <QrAttendanceScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        eventId={id}
        eventName={eventData?.name || "Event"}
        onAttendanceMarked={(attendeeId) => {
          setCards((prev) =>
            prev.map((c) => (c.id === attendeeId ? { ...c, attended: true } : c))
          );
        }}
      />

      <Dialog open={isEmailModalOpen && Boolean(emailModalAttendee)} onOpenChange={(open) => !open && !isSendingEmail && setIsEmailModalOpen(false)}>
          <DialogContent showCloseButton={false} className="w-full max-w-[480px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">
                  Send Custom Email
                </DialogTitle>
                <DialogDescription className="text-sm text-muted mt-1">
                  Send a message directly to {emailModalAttendee?.name} ({emailModalAttendee?.email}).
                </DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => !isSendingEmail && setIsEmailModalOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <form
              className="px-6 pb-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendCustomEmail();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="event-email-subject">Subject <span className="text-primary-strong">*</span></Label>
                <Input
                  id="event-email-subject"
                  required
                  placeholder="Enter email subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={isSendingEmail}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-email-body">Email Body <span className="text-primary-strong">*</span></Label>
                <ShadTextarea
                  id="event-email-body"
                  required
                  placeholder="Write your email content here..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                  disabled={isSendingEmail}
                />
              </div>
              <DialogFooter className="form-actions pt-2">
                <ShadButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSendingEmail}
                  className="order-2 w-full sm:order-1"
                >
                  Cancel
                </ShadButton>
                <ShadButton type="submit" disabled={isSendingEmail} className="order-1 w-full sm:order-2">
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </ShadButton>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isRegistrationInboxOpen} onOpenChange={(open) => {
        if (!open) {
          setIsRegistrationInboxOpen(false);
          setRejectingRegistrationId(null);
          setRegistrationRejectionReason("");
        }
      }}>
          <DialogContent showCloseButton={false} className="w-full max-w-[720px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">
                  Pending Registration Requests
                </DialogTitle>
                <DialogDescription className="text-sm text-muted">Approve or reject guest registrations. Visitors are accepted automatically.</DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  setIsRegistrationInboxOpen(false);
                  setRejectingRegistrationId(null);
                  setRegistrationRejectionReason("");
                }}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <div className="px-6 pb-6 max-h-[62vh] overflow-y-auto flex flex-col gap-3">
              {pendingRegistrations.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No pending registration requests.</p>
              ) : (
                pendingRegistrations.map((req) => (
                  <Card key={req.id} className="rounded-md border-border/50 bg-white/80 p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-heading">{req.attendee_name || "Attendee"}</p>
                      {req.attendee_company ? (
                        <p className="text-xs text-muted">{req.attendee_company}</p>
                      ) : null}
                      {req.attendee_email ? (
                        <p className="text-xs text-muted">{req.attendee_email}</p>
                      ) : null}
                      {req.track ? (
                        <p className="text-xs text-muted capitalize">Track: {req.track}</p>
                      ) : null}
                    </div>
                    {rejectingRegistrationId === req.id ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="grid gap-2">
                          <Label htmlFor={`registration-reject-${req.id}`}>Rejection reason <span className="text-primary-strong">*</span></Label>
                          <ShadTextarea
                            id={`registration-reject-${req.id}`}
                            required
                            value={registrationRejectionReason}
                            onChange={(e) => setRegistrationRejectionReason(e.target.value)}
                            placeholder="Explain why this registration was not approved"
                          />
                        </div>
                        <div className="flex gap-2">
                          <ShadButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRejectingRegistrationId(null);
                              setRegistrationRejectionReason("");
                            }}
                          >
                            Cancel
                          </ShadButton>
                          <ShadButton
                            size="sm"
                            onClick={() =>
                              reviewRegistrationRequest(req.id, "reject", registrationRejectionReason)
                            }
                            disabled={reviewingRegistrationId === req.id}
                          >
                            {reviewingRegistrationId === req.id ? "Rejecting..." : "Confirm Reject"}
                          </ShadButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <ShadButton
                          size="sm"
                          onClick={() => reviewRegistrationRequest(req.id, "approve")}
                          disabled={reviewingRegistrationId === req.id}
                        >
                          {reviewingRegistrationId === req.id ? "Approving..." : "Approve"}
                        </ShadButton>
                        <ShadButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRejectingRegistrationId(req.id);
                            setRegistrationRejectionReason("");
                          }}
                          disabled={reviewingRegistrationId === req.id}
                        >
                          Reject
                        </ShadButton>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
      </Dialog>

      {isAccessInboxOpen && (
        <div className={dashboardModalBackdrop}>
          <div
            className="absolute inset-0 bg-heading/40 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => setIsAccessInboxOpen(false)}
          />
          <div className="relative w-full max-w-[620px] glass-panel bg-white/95 border border-border/70 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 pt-6 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Pending Access Requests</h3>
                <p className="text-sm text-muted">Approve or reject member access for this campaign.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAccessInboxOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 pb-6 max-h-[62vh] overflow-y-auto flex flex-col gap-3">
              {pendingAccessRequests.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No pending requests.</p>
              ) : (
                pendingAccessRequests.map((req) => (
                  <div key={req.id} className="rounded-md border border-border/50 bg-white/80 p-3">
                    <p className="text-sm font-medium text-heading">{req.requester_email}</p>
                    <p className="text-xs text-muted mt-1">Action: {req.requested_action}</p>
                    {req.note ? <p className="text-xs text-muted mt-1">Reason: {req.note}</p> : null}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => reviewAccessRequest(req.id, "approve")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => reviewAccessRequest(req.id, "reject")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAccessControlOpen} onOpenChange={(open) => !open && setIsAccessControlOpen(false)}>
          <DialogContent showCloseButton={false} className="w-full max-w-[620px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Active Access Grants</DialogTitle>
                <DialogDescription className="text-sm text-muted">Revoke member permissions synced to this organization.</DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsAccessControlOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <div className="px-6 pb-6 max-h-[62vh] overflow-y-auto flex flex-col gap-3">
              {isLoadingGrants ? (
                <p className="text-sm text-muted py-6 text-center">Loading grants...</p>
              ) : activeGrants.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">No active grants.</p>
              ) : (
                Object.values(
                  activeGrants.reduce((acc, grant) => {
                    if (!acc[grant.grantee_email]) acc[grant.grantee_email] = { email: grant.grantee_email, grants: [] };
                    acc[grant.grantee_email].grants.push(grant);
                    return acc;
                  }, {} as Record<string, { email: string; grants: typeof activeGrants }>)
                ).map((group) => (
                  <Card key={group.email} className="rounded-md border-border/50 bg-white/80 p-4 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-heading truncate">{group.email}</p>
                    <div className="flex flex-col gap-2">
                      {group.grants.map(grant => (
                        <Card key={grant.id} className="flex flex-row items-center justify-between gap-3 p-2 rounded-sm bg-surface/50 border-border/30">
                          <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted">
                            Permission: <span className="text-heading">{grant.permission}</span>
                          </p>
                          <ShadButton
                            size="sm"
                            variant="secondary"
                            onClick={() => revokeGrant(grant.id)}
                            disabled={revokingGrantId === grant.id}
                            className="h-7 shrink-0 px-3 text-xs disabled:opacity-60"
                          >
                            {revokingGrantId === grant.id ? "Revoking..." : "Revoke"}
                          </ShadButton>
                        </Card>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isBrandingOpen} onOpenChange={(open) => !open && !isSavingBranding && setIsBrandingOpen(false)}>
        <DialogContent showCloseButton={false} className="z-100 flex h-dvh max-h-dvh w-full max-w-none -translate-x-1/2 -translate-y-1/2 flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none">
          <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1540px] flex-1 flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:py-4">
            <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border-border/40 bg-white/90 p-0 shadow-2xl backdrop-blur-sm">
              <DialogHeader className="flex min-w-0 shrink-0 flex-row flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-6 sm:flex-nowrap sm:px-8 sm:pb-4 sm:pt-7">
                <div>
                  <DialogTitle className="text-2xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Card Branding</DialogTitle>
                  <DialogDescription className="text-sm text-muted mt-1.5">Finalize branding first, then share guest/visitor links.</DialogDescription>
                </div>
                <ShadButton
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => !isSavingBranding && setIsBrandingOpen(false)}
                  disabled={isSavingBranding}
                  className="w-9 h-9 rounded-md border border-border/70 flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all duration-150"
                >
                  <X size={16} />
                </ShadButton>
              </DialogHeader>
              <Separator className="bg-border/40" />

              <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
                <div className="relative min-h-[48dvh] min-w-0 overflow-hidden sm:min-h-[54dvh] lg:min-h-[58dvh]">
                  <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden px-1 py-1 sm:px-2 sm:py-2">
                    <BrandingDualPreview
                      socialPreview={<CardPreview data={brandingPreviewData} preview />}
                      badgePreview={
                        <CardPreview data={brandingPreviewData} preview isVertical verticalSide={1} />
                      }
                    />
                  </div>
                </div>

                <Card className="relative z-20 min-h-0 shrink-0 overflow-visible rounded-none border-x-0 border-b-0 border-t border-border/40 bg-white/80 px-5 py-5 shadow-none sm:px-8">
                  <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {/* Item 1: Theme & Background Color */}
                    <div className="relative flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] font-medium tracking-[0.01em] leading-tight text-heading/75">
                          Theme & Background
                        </Label>
                        <span className="text-[11px] font-medium text-muted/80">
                          {BRAND_THEME_COLORS.find((c) => c.name === brandingDraft.card_color)?.label || "Custom Gradient"}
                        </span>
                      </div>
                      <div className="flex h-11 items-center gap-2 flex-wrap">
                        {BRAND_THEME_COLORS.map((c) => (
                          <ShadButton
                            key={c.name}
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setShowBrandCustomColorPicker(false);
                              editBrandingDraft((prev) => ({ ...prev, card_color: c.name }));
                            }}
                            className={`w-8 h-8 rounded-md border p-0 transition-all ${
                              brandingDraft.card_color === c.name
                                ? "ring-2 ring-primary ring-offset-2 scale-110 border-transparent shadow-sm"
                                : "border-white/40 hover:scale-105"
                            }`}
                            style={{ background: `linear-gradient(135deg, ${c.start}, ${c.end})` }}
                            aria-label={`Set ${c.label} theme`}
                            title={c.label}
                          />
                        ))}
                        <ShadButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            setShowBrandTextColorPicker(false);
                            setBrandCustomColorAnchorRect(e.currentTarget.getBoundingClientRect());
                            const initial = isBrandCustomThemeSelected ? brandingDraft.card_color : "#2563EB";
                            setDraftBrandCustomColor(initial);
                            setBrandColorBeforePicker(brandingDraft.card_color);
                            setShowBrandCustomColorPicker(true);
                          }}
                          className={`w-8 h-8 rounded-full transition-all duration-150 relative overflow-hidden flex items-center justify-center p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-95 ${
                            isBrandCustomPickerActive
                              ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-md"
                              : "hover:scale-110 border border-white/40"
                          }`}
                          style={{
                            background:
                              "conic-gradient(from 0deg, #ff4d4f, #ffa940, #fadb14, #73d13d, #36cfc9, #4096ff, #9254de, #f759ab, #ff4d4f)",
                          }}
                          aria-label="Choose custom theme color"
                          title="Choose custom theme color"
                        >
                          <span
                            className="absolute inset-[3px] rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(0,0,0,0.18)]"
                            style={{ background: isBrandCustomThemeSelected ? brandingDraft.card_color : "#ffffff" }}
                          />
                          <span
                            className="relative z-10 text-[14px] font-bold leading-none"
                            style={{ color: isBrandCustomThemeSelected ? "#ffffff" : "#2563EB" }}
                          >
                            +
                          </span>
                        </ShadButton>
                      </div>
                      {showBrandCustomColorPicker && (
                        <CustomColorPicker
                          value={draftBrandCustomColor}
                          anchorRect={brandCustomColorAnchorRect}
                          onChange={(next) => {
                            setDraftBrandCustomColor(next);
                            setBrandingDraft((prev) => ({ ...prev, card_color: next }));
                          }}
                          onCancel={() => {
                            setBrandingDraft((prev) => ({ ...prev, card_color: brandColorBeforePicker }));
                            setShowBrandCustomColorPicker(false);
                          }}
                          onConfirm={() => {
                            editBrandingDraft((prev) => ({ ...prev, card_color: draftBrandCustomColor }));
                            setShowBrandCustomColorPicker(false);
                          }}
                        />
                      )}

                      {/* Manual Color Text Input (HEX, RGB, CSS formats) with validation */}
                      <div className="w-full mt-1">
                        <div className="relative flex items-center">
                          <span
                            className="absolute left-2.5 h-4 w-4 rounded-full border border-black/20 shadow-xs pointer-events-none shrink-0"
                            style={{
                              background: isValidCssColor(brandingDraft.card_color)
                                ? (BRAND_THEME_COLORS.find((c) => c.name === brandingDraft.card_color)?.start || brandingDraft.card_color)
                                : "#41295a",
                            }}
                          />
                          <input
                            type="text"
                            placeholder="#FF5733 or rgb(255, 87, 51)"
                            value={brandingDraft.card_color || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              editBrandingDraft((prev) => ({ ...prev, card_color: val }));
                            }}
                            className="h-8 w-full max-w-[240px] rounded-md border border-border/70 bg-white/90 pl-8 pr-2.5 text-xs text-heading placeholder:text-muted/50 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-colors"
                          />
                        </div>
                        {brandingDraft.card_color?.trim() && !isValidCssColor(brandingDraft.card_color.trim()) && (
                          <span className="mt-0.5 block text-[10px] text-amber-700 font-medium">
                            Enter a valid HEX (#FF5733), RGB, or CSS color
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Item 2: Text Color with Quick Swatches & Spectrum Picker */}
                    <div className="relative flex flex-col gap-2">
                      <Label className="text-[13px] font-medium tracking-[0.01em] leading-tight text-heading/75">
                        Text color
                      </Label>
                      <Card className="flex h-11 w-fit flex-row items-center rounded-md border-border/60 bg-white/85 p-1 shadow-sm">
                        <ShadButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            setActiveBrandTextTarget("horizontal");
                            setShowBrandCustomColorPicker(false);
                            setBrandTextColorAnchorRect(e.currentTarget.getBoundingClientRect());
                            const initial = brandingDraft.horizontal_text_color || "#FFFFFF";
                            setDraftBrandTextColor(initial);
                            setBrandTextColorBeforePicker(brandingDraft.horizontal_text_color);
                            setShowBrandTextColorPicker(true);
                          }}
                          className={`h-9 px-3 text-[12px] font-semibold rounded-sm transition-all flex items-center gap-1.5 ${
                            activeBrandTextTarget === "horizontal" && showBrandTextColorPicker
                              ? "bg-primary/12 text-primary-strong ring-1 ring-primary/30 shadow-sm"
                              : "text-heading/75 hover:bg-slate-100/80"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                            style={{ background: brandingDraft.horizontal_text_color || "#FFFFFF" }}
                          />
                          T1 - Horizontal
                        </ShadButton>
                        <Separator orientation="vertical" className="mx-1 h-5 bg-border/70" />
                        <ShadButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            setActiveBrandTextTarget("vertical");
                            setShowBrandCustomColorPicker(false);
                            setBrandTextColorAnchorRect(e.currentTarget.getBoundingClientRect());
                            const initial = brandingDraft.vertical_text_color || "#FFFFFF";
                            setDraftBrandTextColor(initial);
                            setBrandTextColorBeforePicker(brandingDraft.vertical_text_color);
                            setShowBrandTextColorPicker(true);
                          }}
                          className={`h-9 px-3 text-[12px] font-semibold rounded-sm transition-all flex items-center gap-1.5 ${
                            activeBrandTextTarget === "vertical" && showBrandTextColorPicker
                              ? "bg-primary/12 text-primary-strong ring-1 ring-primary/30 shadow-sm"
                              : "text-heading/75 hover:bg-slate-100/80"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                            style={{ background: brandingDraft.vertical_text_color || "#FFFFFF" }}
                          />
                          T2 - Vertical
                        </ShadButton>
                      </Card>
                      {showBrandTextColorPicker && (
                        <CustomColorPicker
                          value={draftBrandTextColor}
                          anchorRect={brandTextColorAnchorRect}
                          onChange={(next) => {
                            setDraftBrandTextColor(next);
                            if (activeBrandTextTarget === "horizontal") {
                              setBrandingDraft((prev) => ({ ...prev, horizontal_text_color: next }));
                            } else {
                              setBrandingDraft((prev) => ({ ...prev, vertical_text_color: next }));
                            }
                          }}
                          onCancel={() => {
                            if (activeBrandTextTarget === "horizontal") {
                              setBrandingDraft((prev) => ({ ...prev, horizontal_text_color: brandTextColorBeforePicker }));
                            } else {
                              setBrandingDraft((prev) => ({ ...prev, vertical_text_color: brandTextColorBeforePicker }));
                            }
                            setShowBrandTextColorPicker(false);
                          }}
                          onConfirm={() => {
                            if (activeBrandTextTarget === "horizontal") {
                              editBrandingDraft((prev) => ({ ...prev, horizontal_text_color: draftBrandTextColor }));
                            } else {
                              editBrandingDraft((prev) => ({ ...prev, vertical_text_color: draftBrandTextColor }));
                            }
                            setShowBrandTextColorPicker(false);
                          }}
                        />
                      )}
                    </div>

                    {/* Item 3: Typography */}
                    <div className="relative z-30 flex flex-col gap-2 overflow-visible sm:col-span-2 lg:col-span-1">
                      <Label className="text-[13px] font-medium tracking-[0.01em] leading-tight text-heading/75">
                        Typography
                      </Label>
                      <CardTypographyPicker
                        value={brandingDraft.card_font}
                        onChange={(val) => editBrandingDraft((prev) => ({ ...prev, card_font: val }))}
                        preferBelow
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <Separator className="bg-border/40" />
              <DialogFooter className="shrink-0 bg-white/95 px-5 py-4 sm:px-8">
                <div className="grid w-full grid-cols-1 items-center gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <div className="flex justify-center min-[560px]:justify-start">
                    <ShadButton
                      className="w-full min-[560px]:w-auto shrink-0 sm:min-w-[132px]"
                      disabled={isSavingBranding}
                      onClick={saveBrandingConfig}
                    >
                      {isSavingBranding ? "Saving..." : "Save Branding"}
                    </ShadButton>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <ShadButton
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={isSavingBranding || brandingUndoStack.length === 0}
                      onClick={undoBrandingEdit}
                      title="Undo the last theme, text color, or typography change"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Undo2 size={16} className="shrink-0 opacity-90" aria-hidden />
                        Undo
                      </span>
                    </ShadButton>
                    <ShadButton
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={isSavingBranding || brandingRedoStack.length === 0}
                      onClick={redoBrandingEdit}
                      title="Redo a change you undid"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Redo2 size={16} className="shrink-0 opacity-90" aria-hidden />
                        Redo
                      </span>
                    </ShadButton>
                  </div>
                  <div className="flex justify-center min-[560px]:justify-end">
                    <ShadButton
                      variant="secondary"
                      className="w-full min-[560px]:w-auto shrink-0 sm:min-w-[112px]"
                      disabled={isSavingBranding}
                      onClick={() => setIsBrandingOpen(false)}
                    >
                      Cancel
                    </ShadButton>
                  </div>
                </div>
              </DialogFooter>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegistrationFormOpen} onOpenChange={(open) => !open && !isSavingRegistrationForm && setIsRegistrationFormOpen(false)}>
          <DialogContent showCloseButton={false} className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[780px] flex-col overflow-hidden rounded-xl border border-border/70 bg-white/95 p-0 shadow-2xl glass-panel sm:max-h-[calc(100dvh-4rem)]">
            <DialogHeader className="flex shrink-0 flex-row items-start justify-between border-b border-border/40 bg-white/70 px-6 py-5 sm:px-8 sm:pt-7">
              <div className="min-w-0 pr-4">
                <DialogTitle className="text-2xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">
                  {formBuilderRole === "guest" ? "Guest Form Preview" : "Visitor Form Preview"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted mt-1.5">
                  Review the live form and manage custom fields in one place.
                </DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsRegistrationFormOpen(false)}
                className="w-9 h-9 shrink-0 rounded-md border border-border/70 flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all duration-150"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white/40 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-4">
                {getEnabledFieldsForRole(registrationFormDraft, formBuilderRole).map((field) => {
                  const isCustomField = !CORE_PREVIEW_FIELD_IDS.has(field.id);
                  if (!isCustomField) {
                    return (
                      <div key={`builder-preview-${formBuilderRole}-${field.id}`} className="grid gap-2">
                        <Label htmlFor={`builder-preview-${formBuilderRole}-${field.id}`}>
                          {field.label}{field.required ? <span className="text-primary-strong"> *</span> : null}
                        </Label>
                        <Input
                          id={`builder-preview-${formBuilderRole}-${field.id}`}
                          required={field.required}
                          type={field.id === "email" ? "email" : field.inputType}
                          placeholder={field.placeholder || field.label}
                          value=""
                          disabled
                        />
                      </div>
                    );
                  }
                  return (
                    <Card key={`builder-preview-${formBuilderRole}-${field.id}`} className="rounded-md border-border/50 bg-white/70 p-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`builder-preview-${formBuilderRole}-${field.id}`}>
                          {field.label}{field.required ? <span className="text-primary-strong"> *</span> : null}
                        </Label>
                        <Input
                          id={`builder-preview-${formBuilderRole}-${field.id}`}
                          required={field.required}
                          type={field.inputType}
                          placeholder={field.placeholder || field.label}
                          value=""
                          disabled
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <Label
                          htmlFor={`builder-required-${formBuilderRole}-${field.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-heading transition-colors"
                        >
                          <Checkbox
                            id={`builder-required-${formBuilderRole}-${field.id}`}
                            checked={field.required}
                            onCheckedChange={() =>
                              updateDraftFields(formBuilderRole, (fields) =>
                                fields.map((f) => (f.id === field.id ? { ...f, required: !f.required } : f)),
                              )
                            }
                            aria-label={`${field.required ? "Set optional" : "Set required"} for ${field.label}`}
                          />
                          <span className="min-w-[92px] text-sm font-medium leading-none text-[#2F4C97]">
                            {field.required ? "Required" : "Optional"}
                          </span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <ShadButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditCustomField(field)}
                            className="h-8 text-xs border-primary/30 text-primary-strong bg-primary/10 hover:bg-primary/15"
                          >
                            Edit
                          </ShadButton>
                          <ShadButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (editingCustomFieldId === field.id) {
                                setEditingCustomFieldId(null);
                                setNewFieldLabel("");
                                setNewFieldType("text");
                              }
                              updateDraftFields(formBuilderRole, (fields) =>
                                fields.filter((f) => f.id !== field.id),
                              );
                            }}
                            className="h-8 text-xs border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                          >
                            Remove
                          </ShadButton>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="pt-2">
                <Label className="text-sm font-semibold text-heading mb-3">
                  {editingCustomFieldId ? "Edit Custom Field" : "Add Custom Field"}
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="builder-new-field-label">Field Label</Label>
                    <Input
                      id="builder-new-field-label"
                      placeholder="e.g. Website"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="builder-new-field-type">Input Type</Label>
                    <ShadSelect value={newFieldType} onValueChange={(value) => setNewFieldType(value as "text" | "number" | "url")}>
                      <SelectTrigger id="builder-new-field-type" className="h-11 w-full border-border/60 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </ShadSelect>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="flex items-center gap-2">
                    {editingCustomFieldId && (
                      <ShadButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingCustomFieldId(null);
                          setNewFieldLabel("");
                          setNewFieldType("text");
                        }}
                      >
                        Cancel Edit
                      </ShadButton>
                    )}
                    <ShadButton variant="secondary" size="sm" onClick={addCustomFieldToDraft}>
                      {editingCustomFieldId ? "Save Edit" : "Add Field"}
                    </ShadButton>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border/40" />
            <DialogFooter className="shrink-0 bg-white/95 px-6 py-4 sm:px-8">
              <div className="form-actions">
                <ShadButton
                  variant="secondary"
                  className="order-2 w-full sm:order-1"
                  disabled={isSavingRegistrationForm}
                  onClick={() => setIsRegistrationFormOpen(false)}
                >
                  Cancel
                </ShadButton>
                <ShadButton
                  className="order-1 w-full sm:order-2"
                  disabled={isSavingRegistrationForm}
                  onClick={saveRegistrationFormConfig}
                >
                  {isSavingRegistrationForm ? "Saving..." : "Save Form"}
                </ShadButton>
              </div>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isGuestCategoryOpen} onOpenChange={(open) => !open && setIsGuestCategoryOpen(false)}>
          <DialogContent showCloseButton={false} className="w-full max-w-[560px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-8 pt-8 pb-4 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Guest Category</DialogTitle>
                <DialogDescription className="text-base text-muted mt-1">Type category like Judge, Speaker, Chief Guest, Evaluator.</DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsGuestCategoryOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <Separator className="bg-border/40" />
            <form
              className="px-8 pb-8 flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const value = guestCategoryInput.trim();
                if (!value) {
                  setGuestCategoryError("Please enter a guest category.");
                  return;
                }
                const longUrl = `${window.location.origin}/r/${eventData.short_id || eventData.id}?r=g&c=${encodeURIComponent(value)}`;
                const url = await toCompactShareUrl(longUrl);
                setIsGuestCategoryOpen(false);
                openShareActions(url, "guest");
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="event-guest-category">Guest Category <span className="text-primary-strong">*</span></Label>
                <Input
                  id="event-guest-category"
                  required
                  placeholder="e.g. Judge"
                  value={guestCategoryInput}
                  maxLength={40}
                  aria-invalid={Boolean(guestCategoryError)}
                  aria-describedby={guestCategoryError ? "event-guest-category-error" : undefined}
                  onChange={(e) => {
                  setGuestCategoryInput(e.target.value);
                  if (guestCategoryError) setGuestCategoryError("");
                }}
                />
              </div>
              {guestCategoryError && (
                <Alert id="event-guest-category-error" variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{guestCategoryError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="form-actions pt-2">
                <ShadButton type="button" variant="secondary" className="order-2 w-full sm:order-1" onClick={() => setIsGuestCategoryOpen(false)}>
                  Cancel
                </ShadButton>
                <ShadButton type="submit" className="order-1 w-full sm:order-2">
                  Save
                </ShadButton>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isShareActionsOpen} onOpenChange={(open) => !open && setIsShareActionsOpen(false)}>
          <DialogContent showCloseButton={false} className="w-full max-w-[640px] glass-panel bg-white/95 border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-8 pt-8 pb-4 flex-row items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Share Registration</DialogTitle>
                <DialogDescription className="text-base text-muted mt-1">
                  {shareDraftRole === "guest"
                    ? "Use this guest link directly."
                    : "Use the link directly or share on LinkedIn."}
                </DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsShareActionsOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <Separator className="bg-border/40" />
            <div className="px-8 pb-8 flex flex-col gap-4">
              {shareDraftRole === "visitor" && (
                <Card className="rounded-md border-border/60 bg-surface/40 px-4 py-3">
                  <p className="text-sm font-medium tracking-[0.01em] leading-tight text-muted mb-1.5">Default LinkedIn caption</p>
                  <p className="text-sm text-heading wrap-break-word">{shareDraftMessage}</p>
                </Card>
              )}
              <div className={`grid gap-3 ${shareDraftRole === "visitor" ? "grid-cols-2" : "grid-cols-1"}`}>
                <ShadButton
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareDraftUrl);
                      toast.success("Registration link copied.");
                    } catch {
                      toast.error("Could not copy link.");
                    }
                  }}
                >
                  <LinkIcon size={16} />
                  Copy Link
                </ShadButton>
                {shareDraftRole === "visitor" && (
                  <ShadButton
                    onClick={() => {
                      window.open(
                        buildLinkedInFeedShareUrl(shareDraftMessage),
                        "_blank",
                        "noopener,noreferrer",
                      );
                      toast.success("Opening LinkedIn with your post ready to publish.");
                    }}
                  >
                    LinkedIn
                  </ShadButton>
                )}
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {/* Sponsors modal */}
      <Dialog open={isSponsorsOpen && Boolean(eventData)} onOpenChange={(open) => !open && !isSavingSponsors && setIsSponsorsOpen(false)}>
          <DialogContent showCloseButton={false} className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-border/70 bg-white/95 p-0 shadow-2xl glass-panel sm:max-h-[calc(100dvh-4rem)]">
            <DialogHeader className="flex shrink-0 flex-row items-start justify-between border-b border-border/50 px-6 py-5">
              <div className="flex flex-col gap-1 pr-4">
                <DialogTitle className="text-xl font-semibold tracking-[-0.03em] leading-[1.15] text-heading">Event sponsors</DialogTitle>
                <DialogDescription className="text-sm text-muted">
                  Up to five logos with names. They appear on every lead card for this campaign.
                </DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => !isSavingSponsors && setIsSponsorsOpen(false)}
                className="h-9 w-9 shrink-0 rounded-sm border border-border p-0 text-muted transition-colors hover:bg-surface hover:text-heading"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <form onSubmit={handleSaveSponsors} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <EventSponsorsForm
                  rows={sponsorRows}
                  onChange={setSponsorRows}
                  onFileError={(msg) => toast.error(msg)}
                  disabled={isSavingSponsors || isPreviewMode}
                />
              </div>
              <DialogFooter className="shrink-0 border-t border-border/50 bg-white/95 px-6 py-4 sm:flex-row">
                <div className="form-actions w-full">
                  <ShadButton
                    type="button"
                    variant="secondary"
                    className="order-2 w-full sm:order-1"
                    disabled={isSavingSponsors}
                    onClick={() => setIsSponsorsOpen(false)}
                  >
                    Cancel
                  </ShadButton>
                  <ShadButton
                    type="submit"
                    className="order-1 w-full sm:order-2"
                    disabled={isSavingSponsors || isPreviewMode}
                  >
                    {isSavingSponsors ? "Saving..." : "Save sponsors"}
                  </ShadButton>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
          <DialogContent showCloseButton={false} className="w-full max-w-[480px] max-h-[92dvh] flex flex-col glass-panel bg-white border border-border/70 rounded-xl p-0 shadow-2xl overflow-hidden">
            <DialogHeader className="px-8 pt-6 pb-3 flex-row items-start justify-between shrink-0">
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-xl font-bold text-heading tracking-[-0.02em] leading-tight">Edit Campaign</DialogTitle>
                <DialogDescription className="text-[13px] text-muted">Update the campaign details below.</DialogDescription>
              </div>
              <ShadButton
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsEditOpen(false)}
                className="shrink-0 w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all duration-150"
              >
                <X size={16} />
              </ShadButton>
            </DialogHeader>
            <Separator className="bg-border/50" />

            {/* Modal Body + Footer */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-8 pt-5 custom-scrollbar">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <div className="grid gap-2">
                    <Label htmlFor="event-edit-name">Name of the Campaign <span className="text-primary-strong">*</span></Label>
                    <Input
                      id="event-edit-name"
                      required
                      value={editForm.name}
                      maxLength={EVENT_NAME_MAX_CHARS}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-[11px] font-medium ${editForm.name.length >= EVENT_NAME_MAX_CHARS ? "text-amber-600" : "text-muted"}`}>
                      {editForm.name.length}/{EVENT_NAME_MAX_CHARS} chars
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="event-edit-description">Campaign Description</Label>
                  <ShadTextarea
                    id="event-edit-description"
                    placeholder="Describe your campaign (e.g. goals, audience)..."
                    value={editForm.description}
                    maxLength={CAMPAIGN_DESCRIPTION_MAX_CHARS}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                  <Label className="text-[14px] font-normal tracking-[0.01em] leading-tight text-heading">Location Type</Label>
                  <RadioGroup className="flex flex-row gap-4 mb-1" value={editForm.location_type} onValueChange={(value) => setEditForm({ ...editForm, location_type: value as "onsite" | "webinar", ...(value === "webinar" ? { location: "" } : {}) })}>
                     <Label htmlFor="event-edit-location-onsite" className="flex items-center gap-2 cursor-pointer text-sm text-heading">
                        <RadioGroupItem id="event-edit-location-onsite" value="onsite" />
                        Onsite
                     </Label>
                     <Label htmlFor="event-edit-location-webinar" className="flex items-center gap-2 cursor-pointer text-sm text-heading">
                        <RadioGroupItem id="event-edit-location-webinar" value="webinar" />
                        Webinar
                     </Label>
                  </RadioGroup>
                </div>

                {editForm.location_type === "webinar" ? (
                   <div className="flex flex-col gap-2 w-full group opacity-75">
                     <Label htmlFor="event-edit-webinar-readonly" className="text-[14px] font-normal tracking-[0.01em] leading-tight text-heading">Location <span className="text-primary-strong">*</span></Label>
                     <InputGroup className="h-11 bg-surface border-border/60 cursor-not-allowed">
                        <InputGroupAddon><Globe size={18} className="text-muted" /></InputGroupAddon>
                        <InputGroupInput id="event-edit-webinar-readonly" name="locationWebinarLabel" type="text" value="Webinar" disabled className="text-muted cursor-not-allowed" readOnly />
                     </InputGroup>
                   </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="event-edit-location">Location <span className="text-primary-strong">*</span></Label>
                    <Input
                      id="event-edit-location"
                      required
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="event-edit-date">Event Date <span className="text-primary-strong">*</span></Label>
                    <Input
                      id="event-edit-date"
                      required
                      type="date"
                      min={minCampaignDate}
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                  </div>
                  <TimeInput
                    label="Event Time"
                    required
                    value={editForm.time}
                    onChange={(v) => setEditForm({ ...editForm, time: v })}
                  />
                </div>

                <FilePicker
                  label="Campaign Logo"
                  value={editForm.logo}
                  onChange={(v) => setEditForm({ ...editForm, logo: v })}
                  onError={(msg) => toast.error(msg)}
                  freeFormCrop={false}
                  cropAspect={CAMPAIGN_LOGO_CROP_ASPECT}
                  cropTitle="Crop campaign logo"
                  cropSubtitle="Adjust the logo within the fixed frame used on cards."
                  cropApplyLabel="Apply logo"
                />
              </div>
              </div>

              <Separator className="bg-border/50" />
              <DialogFooter className="shrink-0 bg-white p-6 form-actions">
                <ShadButton
                  variant="secondary"
                  onClick={() => setIsEditOpen(false)}
                  className="order-2 w-full sm:order-1"
                >
                  Cancel
                </ShadButton>
                <ShadButton
                  type="submit"
                  disabled={isSavingEdit}
                  className="order-1 w-full sm:order-2"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </ShadButton>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      {/* Delete Event Modal */}
      {isDeleteOpen && eventData && (
        <div className={dashboardModalBackdrop}>
          <div
            className="absolute inset-0 bg-heading/40 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => !isDeleting && setIsDeleteOpen(false)}
          />
          <div className="relative w-full max-w-[460px] glass-panel bg-white/90 border border-border/70 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 pt-8 pb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-2xl font-semibold text-red-500 tracking-[-0.03em] leading-[1.15]">Delete event?</h2>
                <p className="text-sm text-muted">
                  This permanently removes the event, <span className="font-medium text-heading">{cards.length}</span> lead {cards.length === 1 ? "card" : "cards"}, and all uploaded photos. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => !isDeleting && setIsDeleteOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-8 pt-4 flex flex-col gap-6">
              <TextInput
                label={`Type "${deleteConfirmTarget}" to confirm`}
                value={deleteConfirm}
                onChange={setDeleteConfirm}
                autoComplete="off"
              />

              <div className="form-actions pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={isDeleteConfirmValid ? "primary" : "secondary"}
                  fullWidth
                  onClick={() => {
                    if (isDeleting) return;
                    if (!isDeleteConfirmValid) {
                      toast.error("Type the campaign name exactly to confirm.");
                      return;
                    }
                    void handleDeleteEvent();
                  }}
                  disabled={isDeleting}
                  className={`order-1 sm:order-2 ${
                    isDeleteConfirmValid
                      ? "bg-red-500! text-white! border-red-500! hover:bg-red-600! hover:text-white!"
                      : "opacity-60"
                  }`}
                >
                  {isDeleting ? "Deleting..." : "Delete Forever"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Renew Event Modal */}
      {isRenewOpen && (
        <div className={dashboardModalBackdrop}>
          <div
            className="absolute inset-0 bg-heading/40 backdrop-blur-md transition-opacity animate-in fade-in"
            onClick={() => !isRenewing && setIsRenewOpen(false)}
          />
          <div className="relative w-full max-w-[460px] glass-panel bg-white/90 border border-border/70 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold text-heading tracking-[-0.03em] leading-[1.15]">Renew Event</h2>
                <p className="text-sm text-muted">Update the details to reactivate this campaign.</p>
              </div>
              <button
                onClick={() => !isRenewing && setIsRenewOpen(false)}
                className="w-9 h-9 rounded-sm border border-border flex items-center justify-center text-muted hover:text-heading hover:bg-surface transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRenewSubmit} className="p-8 pt-4 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <TextInput
                  label="New Location"
                  required
                  placeholder="e.g. San Francisco, CA"
                  value={renewForm.location}
                  onChange={(v) => setRenewForm({ ...renewForm, location: v })}
                />
                <TextInput
                  label="New Event Date"
                  required
                  type="date"
                  min={minCampaignDate}
                  value={renewForm.date}
                  onChange={(v) => setRenewForm({ ...renewForm, date: v })}
                />
                <FilePicker
                  label="New Event Logo"
                  value={renewForm.logo}
                  onChange={(v) => setRenewForm({ ...renewForm, logo: v })}
                  onError={(msg) => toast.error(msg)}
                  freeFormCrop={false}
                  cropAspect={CAMPAIGN_LOGO_CROP_ASPECT}
                  cropTitle="Crop event logo"
                  cropSubtitle="Adjust the logo within the fixed frame used on cards."
                  cropApplyLabel="Apply logo"
                />
              </div>

              <div className="form-actions pt-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsRenewOpen(false)}
                  disabled={isRenewing}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isRenewing}
                  className="order-1 sm:order-2"
                >
                  {isRenewing ? "Renewing..." : "Renew Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <main className={`${dashboardMainTransparent} flex flex-col items-center`}>
        <GradientBackground />
        <div className={dashboardContentInset}>
          <div className="flex flex-col gap-6 mb-12">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-64 h-12" />
            <div className="flex gap-4">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-32 h-6" />
            </div>
          </div>

          <Skeleton className="w-full h-32 rounded-md mb-10" />
          <Skeleton className="w-full h-14 rounded-sm mb-8" />

          <div className="flex flex-col gap-4">
            <Skeleton className="w-full h-24 rounded-sm" />
            <Skeleton className="w-full h-24 rounded-sm" />
            <Skeleton className="w-full h-24 rounded-sm" />
          </div>
        </div>
      </main>
    }>
      <EventContent params={params} />
    </Suspense>
  );
}
