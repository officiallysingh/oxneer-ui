'use client';

import { useEffect, useState } from 'react';
import { masterApi, StateVM, CityVM, AreaVM } from '@repo/api';
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
import {
  CoordinatesMapField,
  type Coordinates,
} from '@/components/common/admin/CoordinatesMapField';
import { parseApiError } from '@/lib/api-errors';
import {
  AREA_NAME_PATTERN,
  AREA_NAME_ERROR,
  AREA_NAME_TIP,
  AREA_PIN_CODE_PATTERN,
  AREA_PIN_CODE_ERROR,
  AREA_PIN_CODE_TIP,
} from '@/lib/validation';

interface AddAreaPickerDialogProps {
  open: boolean;
  states: StateVM[];
  onClose: () => void;
  onCreated: (area: AreaVM) => void;
}

/** Standalone add-area dialog with state/city pickers (used on the Areas list page). */
export function AddAreaPickerDialog({
  open,
  states,
  onClose,
  onCreated,
}: AddAreaPickerDialogProps) {
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<CityVM[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStateId(states[0]?.id ?? '');
      setName('');
      setPinCode('');
      setCoordinates({});
      setFieldErrors({});
      setError(null);
    }
  }, [open, states]);

  useEffect(() => {
    if (!open || !stateId) {
      setCities([]);
      setCityId('');
      return;
    }
    setCitiesLoading(true);
    setCityId('');
    masterApi
      .getCitiesByState(stateId)
      .then((data) => {
        setCities(data);
        setCityId(data[0]?.id ?? '');
      })
      .catch(() => setError('Failed to load cities for this state.'))
      .finally(() => setCitiesLoading(false));
  }, [open, stateId]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityId) {
      setError('Please select a city.');
      return;
    }
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!AREA_NAME_PATTERN.test(name.trim())) errors.name = AREA_NAME_ERROR;
    if (pinCode.trim() && !AREA_PIN_CODE_PATTERN.test(pinCode.trim())) {
      errors.pinCode = AREA_PIN_CODE_ERROR;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await masterApi.createArea(cityId, {
        name: name.trim(),
        pinCode: pinCode.trim() || undefined,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      const areas = await masterApi.getAreasByCity(cityId);
      const created = areas.find((a) => a.name === name.trim()) ?? areas[areas.length - 1];
      const city = cities.find((c) => c.id === cityId);
      const state = states.find((s) => s.id === stateId);
      if (created) onCreated({ ...created, city: city ? { ...city, state } : undefined });
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to create area.');
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add area</DialogTitle>
          <DialogDescription>Add an area to a city.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="area-state">
              State <span className="text-destructive">*</span>
            </Label>
            <select
              id="area-state"
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
            <Label htmlFor="area-city">
              City <span className="text-destructive">*</span>
            </Label>
            <select
              id="area-city"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={citiesLoading || !cities.length}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {cities.length === 0 && <option value="">No cities in this state</option>}
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="area-name"
              tip={AREA_NAME_TIP}
              className={fieldErrors.name ? 'text-destructive' : ''}
            >
              Name <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="area-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErr('name');
              }}
              placeholder="Andheri"
              autoComplete="off"
              autoFocus
              className={
                fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <LabelWithTip
              htmlFor="area-pincode"
              tip={AREA_PIN_CODE_TIP}
              className={fieldErrors.pinCode ? 'text-destructive' : ''}
            >
              Pin code <span className="text-muted-foreground font-normal">(optional)</span>
            </LabelWithTip>
            <Input
              id="area-pincode"
              value={pinCode}
              onChange={(e) => {
                setPinCode(e.target.value);
                clearErr('pinCode');
              }}
              placeholder="400058"
              autoComplete="off"
              className={
                fieldErrors.pinCode ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {fieldErrors.pinCode && (
              <p className="text-xs text-destructive">{fieldErrors.pinCode}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>
              Coordinates <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <CoordinatesMapField value={coordinates} onChange={setCoordinates} mapHeight={240} />
          </div>
          {error && <ErrorAlert message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !cityId}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving
                </>
              ) : (
                'Add area'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
