'use client';

import { useEffect, useState } from 'react';
import { masterApi, StateVM, CityVM } from '@repo/api';
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
import { CITY_NAME_PATTERN, CITY_NAME_ERROR, CITY_NAME_TIP } from '@/lib/validation';

interface EditCityDialogProps {
  city: CityVM | null;
  states: StateVM[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditCityDialog({ city, states, onClose, onUpdated }: EditCityDialogProps) {
  const [name, setName] = useState('');
  const [stateId, setStateId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (city) {
      setName(city.name);
      setStateId(city.state?.id ?? '');
      setFieldErrors({});
      setError(null);
    }
  }, [city]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return;
    setError(null);
    setFieldErrors({});

    if (!CITY_NAME_PATTERN.test(name.trim())) {
      setFieldErrors({ name: CITY_NAME_ERROR });
      return;
    }

    const patch: Parameters<typeof masterApi.updateCity>[1] = {};
    if (name.trim() !== city.name) patch.name = name.trim();
    if (stateId && stateId !== (city.state?.id ?? '')) patch.stateId = stateId;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await masterApi.updateCity(city.id, patch);
      onUpdated();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update city.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!city}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit city</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{city?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ec-state">State</Label>
            <select
              id="ec-state"
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="ec-name"
              tip={CITY_NAME_TIP}
              className={fieldErrors.name ? 'text-destructive' : ''}
            >
              Name <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="ec-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErr('name');
              }}
              placeholder="Mumbai"
              autoComplete="off"
              autoFocus
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
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
