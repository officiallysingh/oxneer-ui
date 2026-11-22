'use client';

import { useRef, useState, useCallback } from 'react';
import { Pencil, Upload, X, FileImage } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Label } from '@oxneer/ui';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

interface CancelChequeUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | undefined) => void;
  error?: string;
  label?: string;
}

// ── Cheque Picker Popup ───────────────────────────────────────────────────────
interface ChequePickerPopupProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataUrl: string) => void;
  onRemove: () => void;
  hasExisting: boolean;
}

function ChequePickerPopup({
  open,
  onClose,
  onSelect,
  onRemove,
  hasExisting,
}: ChequePickerPopupProps) {
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
          <DialogTitle>Upload cancelled cheque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="flex justify-center">
              <div className="relative w-full max-w-xs rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto max-h-48 object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors"
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
                <FileImage
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

// ── CancelChequeUpload ────────────────────────────────────────────────────────

export function CancelChequeUpload({ value, onChange, error, label }: CancelChequeUploadProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      {label !== undefined ? (
        label ? (
          <Label>{label}</Label>
        ) : null
      ) : (
        <Label>
          Cancelled cheque{' '}
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
      )}

      {/* Clickable preview with pencil overlay — click anywhere to open picker */}
      <button
        type="button"
        onClick={() => setPopupOpen(true)}
        className="relative group w-full h-28 rounded-lg overflow-hidden border border-dashed border-border bg-muted flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Upload cancelled cheque"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Cancelled cheque" className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileImage className="h-6 w-6" />
            <span className="text-xs">Click to upload</span>
          </div>
        )}
        {/* Pencil overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Pencil className="h-4 w-4 text-white" />
        </div>
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <ChequePickerPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSelect={(dataUrl) => onChange(dataUrl)}
        onRemove={() => onChange(undefined)}
        hasExisting={!!value}
      />
    </div>
  );
}
