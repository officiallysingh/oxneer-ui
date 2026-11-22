'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Pencil, Upload, X, ImageIcon } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Label } from '@oxneer/ui';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface AvatarUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | undefined) => void;
  fallbackText?: string;
  error?: string;
  label?: string;
}

// ── Image Picker Popup ────────────────────────────────────────────────────────
interface ImagePickerPopupProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataUrl: string) => void;
  onRemove: () => void;
  hasExisting: boolean;
}

function ImagePickerPopup({
  open,
  onClose,
  onSelect,
  onRemove,
  hasExisting,
}: ImagePickerPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setLocalError(null);
    if (!file.type.startsWith('image/')) {
      setLocalError('Please select an image file.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError('Image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleApply = () => {
    if (preview) {
      onSelect(preview);
      setPreview(null);
      onClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    setLocalError(null);
    onClose();
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload profile picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="flex justify-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="absolute top-0 right-0 bg-background/80 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl py-8 px-4 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-primary/15' : 'bg-muted'}`}
              >
                <ImageIcon
                  className={`h-5 w-5 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP — up to 2MB</p>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {localError && <p className="text-xs text-destructive">{localError}</p>}

          <div className="flex gap-2 justify-end">
            {hasExisting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!preview} onClick={handleApply}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── AvatarUpload ──────────────────────────────────────────────────────────────

export function AvatarUpload({ value, onChange, fallbackText, error, label }: AvatarUploadProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      {label !== undefined ? (
        label ? (
          <Label>{label}</Label>
        ) : null
      ) : (
        <Label>
          Profile picture <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
      )}

      {/* Clickable avatar with pencil overlay — click anywhere on the circle to open picker */}
      <button
        type="button"
        onClick={() => setPopupOpen(true)}
        className="relative group w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change profile picture"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-medium text-muted-foreground select-none">
            {fallbackText}
          </span>
        )}
        {/* Pencil overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Pencil className="h-4 w-4 text-white" />
        </div>
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <ImagePickerPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSelect={(dataUrl) => onChange(dataUrl)}
        onRemove={() => onChange(undefined)}
        hasExisting={!!value}
      />
    </div>
  );
}
