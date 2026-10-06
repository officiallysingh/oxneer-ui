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

interface AddCityPickerDialogProps {
  open: boolean;
  states: StateVM[];
  onClose: () => void;
  onCreated: (city: CityVM) => void;
}

/** Standalone add-city dialog with a state picker (used on the Cities list page). */
export function AddCityPickerDialog({
  open,
  states,
  onClose,
  onCreated,
}: AddCityPickerDialogProps) {
  const [stateId, setStateId] = useState('');
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStateId(states[0]?.id ?? '');
      setName('');
      setFieldError('');
      setError(null);
    }
  }, [open, states]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateId) {
      setError('Please select a state.');
      return;
    }
    setError(null);
    setFieldError('');
    if (!CITY_NAME_PATTERN.test(name.trim())) {
      setFieldError(CITY_NAME_ERROR);
      return;
    }
    setSaving(true);
    try {
      await masterApi.createCity(stateId, { name: name.trim() });
      const cities = await masterApi.getCitiesByState(stateId);
      const created = cities.find((c) => c.name === name.trim()) ?? cities[cities.length - 1];
      const state = states.find((s) => s.id === stateId);
      if (created) onCreated({ ...created, state });
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
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add city</DialogTitle>
          <DialogDescription>Add a city to a state.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="city-state">
              State <span className="text-destructive">*</span>
            </Label>
            <select
              id="city-state"
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
            <Button type="submit" disabled={saving || !states.length}>
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
