'use client';

import { useEffect, useState } from 'react';
import { masterApi, BankVM } from '@oxneer/api';
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
} from '@oxneer/ui';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { parseApiError } from '@/lib/api-errors';

// ── Shared form fields ────────────────────────────────────────────────────────

const IFSC_PREFIX_PATTERN = /^[A-Z]{4}$/;

function sanitizeIfscPrefix(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
}

function validateIfscPrefix(value: string) {
  return IFSC_PREFIX_PATTERN.test(value) ? null : 'IFSC prefix must be 4 uppercase letters.';
}

function BankFields({
  name,
  onName,
  ifscPrefix,
  onIfscPrefix,
  fieldErrors,
  nameId,
  ifscId,
}: {
  name: string;
  onName: (v: string) => void;
  ifscPrefix: string;
  onIfscPrefix: (v: string) => void;
  fieldErrors: Record<string, string>;
  nameId: string;
  ifscId: string;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={nameId} className={fieldErrors.name ? 'text-destructive' : ''}>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="ICICI Bank Limited"
          autoComplete="off"
          className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={ifscId} className={fieldErrors.ifscPrefix ? 'text-destructive' : ''}>
          IFSC prefix <span className="text-destructive">*</span>
        </Label>
        <Input
          id={ifscId}
          value={ifscPrefix}
          onChange={(e) => onIfscPrefix(sanitizeIfscPrefix(e.target.value))}
          placeholder="ICIC"
          maxLength={4}
          autoComplete="off"
          className={`font-mono ${fieldErrors.ifscPrefix ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        />
        {fieldErrors.ifscPrefix && (
          <p className="text-xs text-destructive">{fieldErrors.ifscPrefix}</p>
        )}
      </div>
    </>
  );
}

interface BankFormValues {
  name: string;
  ifscPrefix: string;
}

const EMPTY_BANK_FORM: BankFormValues = { name: '', ifscPrefix: '' };

// ── Create ────────────────────────────────────────────────────────────────────

interface AddBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddBankDialog({ open, onOpenChange, onCreated }: AddBankDialogProps) {
  const [form, setForm] = useState<BankFormValues>(EMPTY_BANK_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof BankFormValues>(key: K, value: BankFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const reset = () => {
    setForm(EMPTY_BANK_FORM);
    setFieldErrors({});
    setError(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const ifscError = validateIfscPrefix(form.ifscPrefix.trim());
    if (ifscError) {
      setFieldErrors({ ifscPrefix: ifscError });
      return;
    }

    setSaving(true);
    try {
      await masterApi.createBank({
        name: form.name.trim(),
        ifscPrefix: form.ifscPrefix.trim(),
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create bank.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add bank</DialogTitle>
          <DialogDescription>Create a new bank.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankFields
            name={form.name}
            onName={(v) => {
              setField('name', v);
              clearErr('name');
            }}
            ifscPrefix={form.ifscPrefix}
            onIfscPrefix={(v) => {
              setField('ifscPrefix', v);
              clearErr('ifscPrefix');
            }}
            fieldErrors={fieldErrors}
            nameId="cb-name"
            ifscId="cb-ifsc"
          />
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add bank'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

interface EditBankDialogProps {
  bank: BankVM | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditBankDialog({ bank, onClose, onUpdated }: EditBankDialogProps) {
  const [form, setForm] = useState<BankFormValues>(EMPTY_BANK_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof BankFormValues>(key: K, value: BankFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (bank) {
      setForm({ name: bank.name, ifscPrefix: bank.ifscPrefix });
      setFieldErrors({});
      setError(null);
    }
  }, [bank]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank) return;
    setError(null);
    setFieldErrors({});

    const patch: Parameters<typeof masterApi.updateBank>[1] = {};
    if (form.name.trim() !== bank.name) patch.name = form.name.trim();
    if (form.ifscPrefix.trim() !== bank.ifscPrefix) patch.ifscPrefix = form.ifscPrefix.trim();

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    if (patch.ifscPrefix !== undefined) {
      const ifscError = validateIfscPrefix(patch.ifscPrefix);
      if (ifscError) {
        setFieldErrors({ ifscPrefix: ifscError });
        return;
      }
    }

    setSaving(true);
    try {
      await masterApi.updateBank(bank.id, patch);
      onUpdated();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update bank.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!bank}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit bank</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{bank?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankFields
            name={form.name}
            onName={(v) => {
              setField('name', v);
              clearErr('name');
            }}
            ifscPrefix={form.ifscPrefix}
            onIfscPrefix={(v) => {
              setField('ifscPrefix', v);
              clearErr('ifscPrefix');
            }}
            fieldErrors={fieldErrors}
            nameId="eb-name"
            ifscId="eb-ifsc"
          />
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
