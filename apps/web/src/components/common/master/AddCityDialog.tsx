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

interface AddCityDialogProps {
  state: StateVM | null;
  onClose: () => void;
  onCreated: (stateId: string, cities: CityVM[]) => void;
}

export function AddCityDialog({ state, onClose, onCreated }: AddCityDialogProps) {
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state) {
      setName('');
      setFieldError('');
      setError(null);
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    setError(null);
    setFieldError('');
    if (!CITY_NAME_PATTERN.test(name.trim())) {
      setFieldError(CITY_NAME_ERROR);
      return;
    }
    setSaving(true);
    try {
      await masterApi.createCity(state.id, { name: name.trim() });
      const cities = await masterApi.getCitiesByState(state.id);
      onCreated(state.id, cities);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors.name) setFieldError(parsed.fieldErrors.name);
      else setError(parsed.general ?? 'Failed to create city.');
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
          <DialogTitle>Add city</DialogTitle>
          <DialogDescription>
            Add a city to <span className="font-medium text-foreground">{state?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="city-name"
              tip={CITY_NAME_TIP}
              className={fieldError ? 'text-destructive' : ''}
            >
              Name <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="city-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError('');
              }}
              placeholder="Mumbai"
              autoComplete="off"
              autoFocus
              className={fieldError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
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
                'Add city'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
