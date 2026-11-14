"use client";

import { useEffect, useState, useId } from "react";
import dynamic from "next/dynamic";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { isAcceptedImageFile } from "@/lib/utils/crop-image";
import { isValidImageDataUrl } from "@/lib/utils/image-data-url";

import { X } from "lucide-react";

const ImageCropperModal = dynamic(
  () => import("../ImageCropperModal").then((m) => m.ImageCropperModal),
  { ssr: false }
);

const FreeformImageCropModal = dynamic(
  () => import("../FreeformImageCropModal").then((m) => m.FreeformImageCropModal),
  { ssr: false }
);

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

export function FilePicker({
  label,
  id,
  name,
  value,
  onChange,
  onError,
  required,
  error,
  cropAspect,
  cropMinZoom,
  cropMaxZoom,
  cropTitle,
  cropSubtitle,
  cropApplyLabel,
  freeFormCrop,
}: {
  label?: string;
  id?: string;
  name?: string;
  value?: string;
  onChange: (base64: string) => void;
  onError?: (message: string) => void;
  required?: boolean;
  error?: string;
  freeFormCrop?: boolean;
  cropAspect?: number;
  cropMinZoom?: number;
  cropMaxZoom?: number;
  cropTitle?: string;
  cropSubtitle?: string;
  cropApplyLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const inputId = id ?? name ?? `file-${uid}`;
  const inputName = name ?? inputId;
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (tempImage?.startsWith("blob:")) {
        URL.revokeObjectURL(tempImage);
      }
    };
  }, [tempImage]);

  const closeCropper = () => {
    setCropperOpen(false);
    setTempImage((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAcceptedImageFile(file)) {
      onError?.("Please upload a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      onError?.("Image must be 20 MB or smaller.");
      e.target.value = "";
      return;
    }

    // Immediately update live preview on file selection
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && isValidImageDataUrl(reader.result)) {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Blob URLs are lighter and more reliable for crop previews than huge data URLs.
    const objectUrl = URL.createObjectURL(file);
    setTempImage(objectUrl);
    setCropperOpen(true);
    e.target.value = "";
  };

  const handleCropComplete = (croppedBase64: string) => {
    if (!isValidImageDataUrl(croppedBase64)) {
      onError?.("Could not process the image. Please try another photo.");
      closeCropper();
      return;
    }
    onChange(croppedBase64);
    closeCropper();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <div className="flex items-center gap-1">
          <Label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </Label>
          {required && <span className="text-sm font-medium text-ink">*</span>}
        </div>
      )}
      <input
        id={inputId}
        name={inputName}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        className={cn(
          "relative flex h-11 items-center overflow-hidden rounded-md border bg-white transition-all duration-200",
          error ? "border-destructive" : "border-hairline-strong hover:border-brand-blue/40"
        )}
      >
        {value ? (
          <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden pl-3 pr-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Preview" className="h-full w-full rounded-sm object-contain" loading="lazy" decoding="async" />
              </div>
              <span className="truncate text-sm font-medium text-ink">Photo selected</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <label
                htmlFor={inputId}
                className="cursor-pointer rounded px-2.5 py-1 text-xs font-medium text-steel hover:text-ink hover:bg-surface transition-colors"
              >
                Change
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("");
                }}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                title="Remove image"
                aria-label="Remove image"
              >
                <X size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          <label htmlFor={inputId} className="flex h-full w-full cursor-pointer items-center">
            <div className="flex-1 truncate px-4 py-2 text-base font-medium text-steel">Choose File</div>
            <div className="flex h-full items-center border-l border-hairline bg-surface px-4 text-sm font-medium text-steel">Browse</div>
          </label>
        )}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {cropperOpen && tempImage && (
        freeFormCrop !== false ? (
          <FreeformImageCropModal
            image={tempImage}
            onCropComplete={handleCropComplete}
            onError={onError}
            onClose={closeCropper}
            title={cropTitle ?? "Crop image"}
            subtitle={cropSubtitle ?? "Drag the corners or edges to adjust the crop."}
            applyLabel={cropApplyLabel ?? "Apply"}
          />
        ) : (
          <ImageCropperModal
            image={tempImage}
            onCropComplete={handleCropComplete}
            onError={onError}
            onClose={closeCropper}
            aspect={cropAspect ?? 1}
            minZoom={cropMinZoom ?? 1}
            maxZoom={cropMaxZoom ?? 3}
            title={cropTitle ?? "Crop image"}
            subtitle={cropSubtitle ?? "Use a square crop for best card branding."}
            applyLabel={cropApplyLabel ?? "Apply logo"}
          />
        )
      )}
    </div>
  );
}
