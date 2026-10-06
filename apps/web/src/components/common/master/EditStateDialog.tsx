'use client';

import { useEffect, useState } from 'react';
import { masterApi, StateVM } from '@repo/api';
import { Loader2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { LabelWithTip } from '@/components/common/admin/LabelWithTip';
import { parseApiError } from '@/lib/api-errors';
import { resolvesExists } from '@/lib/exists-check';
import {
  STATE_NAME_PATTERN,
  STATE_NAME_ERROR,
  STATE_NAME_TIP,
  STATE_CODE_PATTERN,
  STATE_CODE_ERROR,
  STATE_CODE_TIP,
} from '@/lib/validation';

interface EditStateDialogProps {
  state: StateVM | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditStateDialog({ state, onClose, onUpdated }: EditStateDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isUT, setIsUT] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) {
      setCode(state.code ?? '');
      setName(state.name);
      setIsUT(!!state.isUT);
      setFieldErrors({});
      setError(null);
    }
  }, [state]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!STATE_CODE_PATTERN.test(code.trim())) errors.code = STATE_CODE_ERROR;
    if (!STATE_NAME_PATTERN.test(name.trim())) errors.name = STATE_NAME_ERROR;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const patch: Parameters<typeof masterApi.updateState>[1] = {};
    if (code.trim() !== (state.code ?? '')) patch.code = code.trim();
    if (name.trim() !== state.name) patch.name = name.trim();
    if (isUT !== !!state.isUT) patch.isUT = isUT;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await masterApi.updateState(state.id, patch);
      onUpdated();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update state.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!state}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit state</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{state?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="es-code"
              tip={STATE_CODE_TIP}
              className={fieldErrors.code ? 'text-destructive' : ''}
            >
              Code <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="es-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                clearErr('code');
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!STATE_CODE_PATTERN.test(value) || value === (state?.code ?? '')) return;
                const taken = await resolvesExists(masterApi.checkStateCodeExists(value));
                if (taken) setFieldErrors((p) => ({ ...p, code: 'This code is already in use.' }));
              }}
              placeholder="MH"
              maxLength={2}
              autoComplete="off"
              autoFocus
              className={`font-mono ${fieldErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {fieldErrors.code && <p className="text-xs text-destructive">{fieldErrors.code}</p>}
          </div>
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="es-name"
              tip={STATE_NAME_TIP}
              className={fieldErrors.name ? 'text-destructive' : ''}
            >
              Name <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="es-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErr('name');
              }}
              placeholder="Maharashtra"
              autoComplete="off"
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isUT}
              onChange={(e) => setIsUT(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary shrink-0"
            />
            <span className="text-sm text-foreground">Union Territory</span>
          </label>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
