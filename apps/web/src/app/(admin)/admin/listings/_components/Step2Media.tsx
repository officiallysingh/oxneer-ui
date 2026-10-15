'use client';

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  FileText,
  Film,
  ImageIcon,
  Tag,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Button } from '@repo/ui';
import { blobsApi, BlobVM, BlobProperties } from '@repo/api';
import type { BlobPropertyPatch } from '@repo/api';

interface UploadedFile {
  file: File;
  blob?: BlobVM;
  uploading: boolean;
  error?: string;
  thumbnail: boolean;
  blobMeta: Record<string, string>;
  classifier: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  previewUrl?: string;
}

const ALLOWED_TYPES: Record<UploadedFile['classifier'], string[]> = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  DOCUMENT: [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/rtf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-tika-msoffice',
    'application/x-tika-ooxml',
  ],
};

const FORMATS: Record<UploadedFile['classifier'], string> = {
  IMAGE: 'JPEG, PNG, GIF, WEBP, HEIC',
  VIDEO: 'MP4, WEBM, QuickTime, AVI, Matroska',
  DOCUMENT: 'Plain Text, PDF, DOC, RTF, DOCX',
};

const ACCEPT: Record<UploadedFile['classifier'], string> = {
  IMAGE: ALLOWED_TYPES.IMAGE.join(','),
  VIDEO: ALLOWED_TYPES.VIDEO.join(','),
  DOCUMENT: ALLOWED_TYPES.DOCUMENT.join(','),
};

const MAX_PER_TYPE = 5;

interface Step2Props {
  listingId: string;
  username: string;
  uploads: UploadedFile[];
  onUploadsChange: (uploads: UploadedFile[]) => void;
  /** Called with blob IDs and any changed blob properties */
  onSave: (blobIds: string[], blobProperties: Record<string, BlobPropertyPatch>) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

function blobDisplayClassifier(blob: BlobVM): UploadedFile['classifier'] {
  // mediaType can be a string like "image/jpeg" or a BlobMediaType object
  const mt =
    typeof blob.mediaType === 'string'
      ? blob.mediaType
      : blob.mediaType
        ? `${blob.mediaType.type ?? ''}/${blob.mediaType.subtype ?? ''}`
        : '';
  if (mt.startsWith('image/')) return 'IMAGE';
  if (mt.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

function fileClassifier(file: File): UploadedFile['classifier'] {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

// ─── BlobMetaEditor ──────────────────────────────────────────────────────────

function BlobMetaEditor({
  meta,
  onChange,
  onRegisterFlush,
  editorKey,
  onPendingChange,
}: {
  meta: Record<string, string>;
  onChange: (meta: Record<string, string>) => void;
  onRegisterFlush?: (flush: () => void) => void;
  editorKey?: string;
  onPendingChange?: (key: string, hasPending: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const pendingRef = useRef({ newKey, newVal, meta, onChange });
  useLayoutEffect(() => {
    pendingRef.current = { newKey, newVal, meta, onChange };
  });

  useEffect(() => {
    onRegisterFlush?.(() => {
      const { newKey: k, newVal: v, meta: m, onChange: cb } = pendingRef.current;
      const trimmed = k.trim();
      if (!trimmed) return;
      cb({ ...m, [trimmed]: v.trim() });
    });
  }, [onRegisterFlush]);

  const onPendingChangeRef = useRef(onPendingChange);
  useLayoutEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  });

  useEffect(() => {
    if (!editorKey) return;
    onPendingChangeRef.current?.(editorKey, adding && newKey.trim().length > 0);
  }, [adding, newKey, editorKey]);

  useEffect(() => {
    if (!editorKey) return;
    return () => {
      onPendingChangeRef.current?.(editorKey, false);
    };
  }, [editorKey]);

  const entries = Object.entries(meta).filter(([k]) => k !== 'thumbnail');

  const update = (k: string, v: string) => onChange({ ...meta, [k]: v });
  const remove = (k: string) => {
    const next = { ...meta };
    delete next[k];
    onChange(next);
  };
  const add = () => {
    const k = newKey.trim();
    if (!k) return;
    onChange({ ...meta, [k]: newVal.trim() });
    setNewKey('');
    setNewVal('');
    setAdding(false);
  };
  const cancelAdd = () => {
    setNewKey('');
    setNewVal('');
    setAdding(false);
  };

  return (
    <div className="border-t border-border/50 pt-1 mt-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
      >
        <Tag className="h-2.5 w-2.5 shrink-0" />
        <span>Labels{entries.length > 0 ? ` (${entries.length})` : ''}</span>
        {open ? (
          <ChevronUp className="h-2.5 w-2.5 ml-auto shrink-0" />
        ) : (
          <ChevronDown className="h-2.5 w-2.5 ml-auto shrink-0" />
        )}
      </button>

      {open && (
        <div className="space-y-0.5 mt-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-0.5">
              <input
                className="w-16 shrink-0 text-[9px] bg-muted/80 rounded px-1 py-px border border-border focus:outline-none focus:border-primary font-medium text-muted-foreground"
                value={k}
                readOnly
                title={k}
              />
              <span className="text-[9px] text-muted-foreground shrink-0">:</span>
              <input
                className="flex-1 min-w-0 text-[9px] bg-muted/80 rounded px-1 py-px border border-border focus:outline-none focus:border-primary"
                value={v}
                onChange={(e) => update(k, e.target.value)}
              />
              <button
                type="button"
                onClick={() => remove(k)}
                className="shrink-0 ml-0.5 text-muted-foreground/60 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-0.5 pt-0.5 border-t border-border/40">
              <input
                autoFocus
                placeholder="key"
                className="w-16 shrink-0 text-[9px] bg-muted/80 rounded px-1 py-px border border-border focus:outline-none focus:border-primary"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add();
                  if (e.key === 'Escape') cancelAdd();
                }}
              />
              <input
                placeholder="value"
                className="flex-1 min-w-0 text-[9px] bg-muted/80 rounded px-1 py-px border border-border focus:outline-none focus:border-primary"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add();
                  if (e.key === 'Escape') cancelAdd();
                }}
              />
              <button
                type="button"
                onClick={add}
                disabled={!newKey.trim()}
                className="shrink-0 text-primary hover:opacity-80 disabled:opacity-30 transition-opacity"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors pt-0.5"
            >
              <Plus className="h-2.5 w-2.5" />
              Add label
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MediaBlock ───────────────────────────────────────────────────────────────

interface MediaBlockProps {
  classifier: UploadedFile['classifier'];
  uploads: UploadedFile[];
  existingBlobs: BlobVM[];
  onAddFiles: (files: FileList | null, classifier: UploadedFile['classifier']) => void;
  onRemoveUpload: (idx: number) => void;
  onRemoveExisting: (id: string) => void;
  onSetThumbnail: (idx: number, checked: boolean) => void;
  onSetExistingThumbnail: (id: string, checked: boolean) => void;
  onSetUploadMeta: (idx: number, meta: Record<string, string>) => void;
  onSetExistingMeta: (id: string, meta: Record<string, string>) => void;
  flushRegistry: React.MutableRefObject<Map<string, () => void>>;
  onPendingChange: (key: string, hasPending: boolean) => void;
}

function MediaBlock({
  classifier,
  uploads,
  existingBlobs,
  onAddFiles,
  onRemoveUpload,
  onRemoveExisting,
  onSetThumbnail,
  onSetExistingThumbnail,
  onSetUploadMeta,
  onSetExistingMeta,
  flushRegistry,
  onPendingChange,
}: MediaBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const myUploads = uploads
    .map((u, i) => ({ ...u, originalIdx: i }))
    .filter((u) => u.classifier === classifier);
  const myExisting = existingBlobs.filter((b) => blobDisplayClassifier(b) === classifier);
  const total = myUploads.length + myExisting.length;
  const remaining = MAX_PER_TYPE - total;
  const atLimit = remaining <= 0;

  const Icon = classifier === 'IMAGE' ? ImageIcon : classifier === 'VIDEO' ? Film : FileText;
  const iconColor =
    classifier === 'IMAGE'
      ? 'text-info'
      : classifier === 'VIDEO'
        ? 'text-purple-500'
        : 'text-warning';
  const borderColor =
    classifier === 'IMAGE'
      ? 'border-info/30'
      : classifier === 'VIDEO'
        ? 'border-purple-200 dark:border-purple-900'
        : 'border-warning/30';
  const headerBg =
    classifier === 'IMAGE'
      ? 'bg-info/10'
      : classifier === 'VIDEO'
        ? 'bg-purple-10 dark:bg-purple-950/30'
        : 'bg-warning/10';
  const label = classifier === 'IMAGE' ? 'Images' : classifier === 'VIDEO' ? 'Videos' : 'Documents';

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden flex flex-col`}>
      {/* Block header */}
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between border-b ${borderColor}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{FORMATS[classifier]}</span>
          <span>·</span>
          {/* Slot indicator */}
          <span className={`font-medium ${atLimit ? 'text-destructive' : 'text-foreground'}`}>
            {total}/{MAX_PER_TYPE}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Slot progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: MAX_PER_TYPE }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < total
                  ? atLimit
                    ? 'bg-destructive'
                    : classifier === 'IMAGE'
                      ? 'bg-info'
                      : classifier === 'VIDEO'
                        ? 'bg-purple-500'
                        : 'bg-warning'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* File grid */}
        {(myUploads.length > 0 || myExisting.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Existing blobs */}
            {myExisting.map((blob) => {
              const isThumbnail = blob.metadata?.['thumbnail'] === 'true';
              return (
                <div
                  key={blob.id}
                  className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                    isThumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                  }`}
                >
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {classifier === 'IMAGE' ? (
                      <Image
                        src={blobsApi.getDownloadUrl(blob.id)}
                        alt={blob.fileName || 'image'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : classifier === 'VIDEO' ? (
                      <Film className="h-8 w-8 text-purple-400" />
                    ) : (
                      <FileText className="h-8 w-8 text-warning" />
                    )}
                    {isThumbnail && (
                      <div className="absolute top-1 left-1 rounded bg-primary px-1 py-0.5 text-[9px] text-primary-foreground font-medium leading-none">
                        Thumb
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(blob.id)}
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1">
                    <p
                      className="text-[10px] font-medium text-foreground truncate"
                      title={blob.fileName}
                    >
                      {blob.fileName}
                    </p>
                    {classifier === 'IMAGE' && (
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 rounded px-2 py-1 hover:bg-muted/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={isThumbnail}
                          onChange={(e) => onSetExistingThumbnail(blob.id, e.target.checked)}
                          className="accent-primary h-3 w-3"
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            isThumbnail ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {isThumbnail ? '✓ Thumbnail' : 'Set as thumbnail'}
                        </span>
                      </label>
                    )}
                    <BlobMetaEditor
                      meta={Object.fromEntries(
                        Object.entries(blob.metadata ?? {}).filter(([k]) => k !== 'thumbnail'),
                      )}
                      onChange={(m) => onSetExistingMeta(blob.id, m)}
                      onRegisterFlush={(fn) => flushRegistry.current.set(`existing-${blob.id}`, fn)}
                      editorKey={`existing-${blob.id}`}
                      onPendingChange={onPendingChange}
                    />
                  </div>
                </div>
              );
            })}

            {/* New uploads */}
            {myUploads.map((u) => (
              <div
                key={u.originalIdx}
                className={`relative rounded-lg border overflow-hidden bg-muted/20 flex flex-col ${
                  u.thumbnail ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                }`}
              >
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {classifier === 'IMAGE' && u.previewUrl ? (
                    <Image src={u.previewUrl} alt={u.file.name} fill className="object-cover" />
                  ) : classifier === 'VIDEO' ? (
                    <Film className="h-8 w-8 text-purple-400" />
                  ) : (
                    <FileText className="h-8 w-8 text-warning" />
                  )}
                  {u.uploading && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-[9px] text-primary font-medium">Uploading...</span>
                    </div>
                  )}
                  {!u.uploading && u.blob && (
                    <div className="absolute top-1 left-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success drop-shadow" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveUpload(u.originalIdx)}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-1.5 space-y-1">
                  <p
                    className="text-[10px] font-medium text-foreground truncate"
                    title={u.file.name}
                  >
                    {u.file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(u.file.size / 1024).toFixed(0)} KB
                  </p>
                  {classifier === 'IMAGE' && (
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-muted/50 rounded px-2 py-1 hover:bg-muted/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={u.thumbnail}
                        onChange={(e) => onSetThumbnail(u.originalIdx, e.target.checked)}
                        className="accent-primary h-3 w-3"
                      />
                      <span
                        className={`text-[10px] font-medium ${
                          u.thumbnail ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {u.thumbnail ? '✓ Thumbnail' : 'Set as thumbnail'}
                      </span>
                    </label>
                  )}
                  {u.error && <p className="text-[10px] text-destructive">{u.error}</p>}
                  <BlobMetaEditor
                    meta={u.blobMeta}
                    onChange={(m) => onSetUploadMeta(u.originalIdx, m)}
                    onRegisterFlush={(fn) =>
                      flushRegistry.current.set(`upload-${u.originalIdx}`, fn)
                    }
                    editorKey={`upload-${u.originalIdx}`}
                    onPendingChange={onPendingChange}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {!atLimit && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onAddFiles(e.dataTransfer.files, classifier);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg py-6 px-4 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.02] shadow-md'
                : 'border-border hover:border-primary/40 hover:bg-muted/20'
            }`}
          >
            <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Drop files here or <span className="text-primary font-medium">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {remaining} slot{remaining !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT[classifier]}
              className="hidden"
              onChange={(e) => onAddFiles(e.target.files, classifier)}
            />
          </div>
        )}

        {atLimit && (
          <p className="text-xs text-destructive text-center py-2">
            Maximum {MAX_PER_TYPE} {label.toLowerCase()} reached
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step2Media ───────────────────────────────────────────────────────────────

export function Step2Media({
  listingId,
  username,
  uploads,
  onUploadsChange,
  onSave,
  onNext,
  onBack,
  onCancel,
}: Step2Props) {
  const [existingBlobs, setExistingBlobs] = useState<BlobVM[]>([]);
  const [originalBlobs, setOriginalBlobs] = useState<BlobVM[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingEditors, setPendingEditors] = useState<Set<string>>(new Set());

  const handlePendingChange = useCallback((key: string, hasPending: boolean) => {
    setPendingEditors((prev) => {
      const next = new Set(prev);
      if (hasPending) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!listingId) return;
    const controller = new AbortController();
    setLoadingBlobs(true);
    blobsApi
      .getBlobsByEntityId(listingId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setExistingBlobs(data);
          setOriginalBlobs(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setExistingBlobs([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingBlobs(false);
      });
    return () => controller.abort();
  }, [listingId]);

  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;
  const existingBlobsRef = useRef(existingBlobs);
  const originalBlobsRef = useRef(originalBlobs);
  // Registry of pending-add flush functions from all BlobMetaEditor instances
  const flushRegistry = useRef<Map<string, () => void>>(new Map());

  // Keep refs in sync after state commits (useEffect runs after paint, guaranteeing fresh values)
  useEffect(() => {
    existingBlobsRef.current = existingBlobs;
  }, [existingBlobs]);

  useEffect(() => {
    originalBlobsRef.current = originalBlobs;
  }, [originalBlobs]);

  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
  }, []);

  const countByType = (cls: UploadedFile['classifier']) =>
    uploads.filter((u) => u.classifier === cls).length +
    existingBlobs.filter((b) => blobDisplayClassifier(b) === cls).length;

  const handleAddFiles = async (
    files: FileList | null,
    forClassifier: UploadedFile['classifier'],
  ) => {
    if (!files?.length) return;
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const cls = fileClassifier(file);
      if (!ALLOWED_TYPES[forClassifier].includes(file.type)) {
        errors.push(
          `"${file.name}" is not an allowed ${forClassifier.toLowerCase()} type (${file.type || 'unknown'}).`,
        );
        return;
      }
      if (countByType(cls) >= MAX_PER_TYPE) {
        errors.push(`Max ${MAX_PER_TYPE} ${cls.toLowerCase()}s allowed.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length) alert(errors.join('\n'));
    if (!validFiles.length) return;

    const newUploads: UploadedFile[] = validFiles.map((file) => ({
      file,
      uploading: true,
      thumbnail: false,
      blobMeta: {},
      classifier: forClassifier,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    onUploadsChange([...uploadsRef.current, ...newUploads]);

    for (const item of newUploads) {
      try {
        const blob = await blobsApi.upload(item.file, {
          bucket: username,
          entityId: listingId,
          classifier: item.classifier === 'DOCUMENT' ? 'LISTING_DOC' : 'LISTING_MEDIA',
          metadata: { thumbnail: 'false' },
        } satisfies BlobProperties);
        // Use uploadsRef.current so any blobMeta edits made during upload are preserved
        onUploadsChange(
          uploadsRef.current.map((u) =>
            u.file === item.file && u.uploading ? { ...u, blob, uploading: false } : u,
          ),
        );
      } catch {
        onUploadsChange(
          uploadsRef.current.map((u) =>
            u.file === item.file && u.uploading
              ? { ...u, uploading: false, error: 'Upload failed. Please try again.' }
              : u,
          ),
        );
      }
    }
  };

  const setThumbnail = (idx: number, checked: boolean) => {
    onUploadsChange(
      uploads.map((u, i) => ({
        ...u,
        thumbnail:
          u.classifier === 'IMAGE'
            ? i === idx
              ? checked
              : checked
                ? false
                : u.thumbnail
            : u.thumbnail,
      })),
    );
  };

  const handleSetUploadMeta = (idx: number, meta: Record<string, string>) => {
    onUploadsChange(uploads.map((u, i) => (i === idx ? { ...u, blobMeta: meta } : u)));
  };

  const handleSetExistingMeta = (id: string, nonThumbnailMeta: Record<string, string>) => {
    setExistingBlobs((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const thumbnail = b.metadata?.['thumbnail'] ?? 'false';
        return { ...b, metadata: { thumbnail, ...nonThumbnailMeta } };
      }),
    );
  };

  const setExistingBlobThumbnail = (blobId: string, checked: boolean) => {
    if (checked) {
      onUploadsChange(
        uploads.map((u) => ({ ...u, thumbnail: u.classifier === 'IMAGE' ? false : u.thumbnail })),
      );
    }
    setExistingBlobs((prev) =>
      prev.map((b) => {
        if (b.id === blobId)
          return { ...b, metadata: { ...b.metadata, thumbnail: checked ? 'true' : 'false' } };
        if (checked && blobDisplayClassifier(b) === 'IMAGE')
          return { ...b, metadata: { ...b.metadata, thumbnail: 'false' } };
        return b;
      }),
    );
  };

  const removeUpload = (idx: number) => {
    const u = uploads[idx];
    if (u?.previewUrl) URL.revokeObjectURL(u.previewUrl);
    onUploadsChange(uploads.filter((_, i) => i !== idx));
  };

  const removeExistingBlob = (blobId: string) => {
    setExistingBlobs((prev) => prev.filter((b) => b.id !== blobId));
  };

  /** Returns true if two metadata objects differ (order-insensitive) */
  const metadataChanged = (
    a: Record<string, string> | undefined,
    b: Record<string, string> | undefined,
  ): boolean => {
    const ma = a ?? {};
    const mb = b ?? {};
    const keysA = Object.keys(ma);
    const keysB = Object.keys(mb);
    if (keysA.length !== keysB.length) return true;
    return keysA.some((k) => ma[k] !== mb[k]) || keysB.some((k) => !(k in ma));
  };

  /** Build blobProperties patch — only blobs whose metadata changed */
  const buildBlobProperties = (
    currentExisting: BlobVM[] = existingBlobs,
    currentOriginal: BlobVM[] = originalBlobs,
    currentUploads: UploadedFile[] = uploads,
  ): Record<string, BlobPropertyPatch> => {
    const result: Record<string, BlobPropertyPatch> = {};

    // Existing blobs with changed metadata (e.g. thumbnail toggled, key-value added)
    currentExisting.forEach((blob) => {
      const orig = currentOriginal.find((o) => o.id === blob.id);
      if (!orig) return;
      if (metadataChanged(orig.metadata, blob.metadata)) {
        result[blob.id] = { metadata: blob.metadata as Record<string, string> };
      }
    });

    // New uploads — merge custom metadata with thumbnail flag
    currentUploads.forEach((u) => {
      if (u.blob?.id) {
        const mergedMeta = {
          ...u.blobMeta,
          thumbnail: u.thumbnail ? 'true' : 'false', // always overrides any blobMeta.thumbnail
        };
        // Only patch if there's something meaningful to update
        if (Object.keys(u.blobMeta).length > 0 || u.thumbnail) {
          result[u.blob.id] = { metadata: mergedMeta };
        }
      }
    });

    return result;
  };

  const handleSaveAndContinue = async () => {
    setSaveError(null);

    // Flush any pending add-row inputs from all BlobMetaEditor instances
    flushRegistry.current.forEach((flush) => flush());

    // Small yield so the state updates from flush calls are committed before we read refs
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // Use refs to guarantee fresh state regardless of closure age
    const freshExisting = existingBlobsRef.current;
    const freshOriginal = originalBlobsRef.current;
    const freshUploads = uploadsRef.current;

    const newBlobIds = freshUploads.filter((u) => u.blob?.id).map((u) => u.blob!.id);
    const blobProperties = buildBlobProperties(freshExisting, freshOriginal, freshUploads);
    const hasBlobPropertyChanges = Object.keys(blobProperties).length > 0;

    const blobsRemoved =
      freshOriginal.length !== freshExisting.length ||
      freshOriginal.some((o) => !freshExisting.some((b) => b.id === o.id));

    const hasChanges = newBlobIds.length > 0 || blobsRemoved || hasBlobPropertyChanges;

    // If nothing changed, skip API calls and move on
    if (!hasChanges) {
      onNext();
      return;
    }

    setSaving(true);
    try {
      // Patch metadata on each changed blob directly
      await Promise.all(
        Object.entries(blobProperties)
          .filter(([, patch]) => patch.metadata && Object.keys(patch.metadata).length > 0)
          .map(([blobId, patch]) => blobsApi.updateBlob(blobId, { metadata: patch.metadata })),
      );
      await onSave([...freshExisting.map((b) => b.id), ...newBlobIds], blobProperties);
      onUploadsChange([]);
      onNext();
    } catch {
      setSaveError('Failed to save media. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const anyUploading = uploads.some((u) => u.uploading);

  const hasMediaChanges =
    pendingEditors.size > 0 ||
    uploads.length > 0 ||
    originalBlobs.length !== existingBlobs.length ||
    originalBlobs.some((o) => !existingBlobs.some((b) => b.id === o.id)) ||
    Object.keys(buildBlobProperties()).length > 0;

  const blockProps = (cls: UploadedFile['classifier']) => ({
    classifier: cls,
    uploads,
    existingBlobs,
    onAddFiles: handleAddFiles,
    onRemoveUpload: removeUpload,
    onRemoveExisting: removeExistingBlob,
    onSetThumbnail: setThumbnail,
    onSetExistingThumbnail: setExistingBlobThumbnail,
    onSetUploadMeta: handleSetUploadMeta,
    onSetExistingMeta: handleSetExistingMeta,
    flushRegistry,
    onPendingChange: handlePendingChange,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Media files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images, videos, and documents. Max {MAX_PER_TYPE} files per type.{' '}
            <span className="text-primary font-medium">
              Only one image can be set as thumbnail.
            </span>
          </p>
        </div>

        {loadingBlobs ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Loading existing media...</p>
              <p className="text-xs">Please wait while we fetch your files</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <MediaBlock {...blockProps('IMAGE')} />
            <MediaBlock {...blockProps('VIDEO')} />
            <MediaBlock {...blockProps('DOCUMENT')} />
          </div>
        )}
      </div>

      {saveError && <p className="text-xs text-destructive">{saveError}</p>}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {hasMediaChanges ? (
          <Button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={saving || anyUploading}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={onNext}
            disabled={saving || anyUploading}
            className="gap-2"
          >
            Skip <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
