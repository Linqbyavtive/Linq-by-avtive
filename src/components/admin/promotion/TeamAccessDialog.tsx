"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button as ShadButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TeamAccessRole } from "./types";

interface TeamAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
}

const DEFAULT_ROLES: TeamAccessRole[] = [
  { id: "admin", label: "Admin", enabled: true },
  { id: "marketing", label: "Marketing", enabled: true },
  { id: "event_team", label: "Event Team", enabled: false },
];

function getStoredRoles(storageKey: string): TeamAccessRole[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_ROLES;
}

export function TeamAccessDialog({ open, onOpenChange, eventId }: TeamAccessDialogProps) {
  const storageKey = eventId ? `linq_promotion_team_access_${eventId}` : "linq_promotion_team_access";
  const [roles, setRoles] = useState<TeamAccessRole[]>(() => getStoredRoles(storageKey));
  const [isSaving, setIsSaving] = useState(false);

  const toggleRole = (roleId: string) => {
    if (roleId === "admin") return;
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(roles));
      }
      toast.success("Team access updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save team access");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[360px] bg-white border border-border/80 rounded-xl p-6 shadow-xl"
      >
        <DialogHeader className="p-0 mb-5">
          <DialogTitle className="text-lg font-semibold text-heading tracking-tight">
            Team Access
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 mb-6">
          {roles.map((role) => {
            const isAdmin = role.id === "admin";
            return (
              <label
                key={role.id}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg border border-border/50 transition-colors ${
                  isAdmin ? "bg-surface/30 cursor-default" : "hover:bg-surface/50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-heading">{role.label}</span>
                  {isAdmin && (
                    <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                <Checkbox
                  checked={isAdmin ? true : role.enabled}
                  disabled={isAdmin}
                  onCheckedChange={() => toggleRole(role.id)}
                  className="w-4 h-4 rounded"
                />
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          <ShadButton
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </ShadButton>
          <ShadButton
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs font-semibold px-4"
          >
            {isSaving ? "Saving..." : "Save"}
          </ShadButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
