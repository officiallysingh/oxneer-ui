'use client';

import { useEffect, useRef, useState } from 'react';
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

interface EditAreaDialogProps {
  area: AreaVM | null;
  states: StateVM[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditAreaDialog({ area, states, onClose, onUpdated }: EditAreaDialogProps) {
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

  // Target city id to select once the cities-for-state fetch below resolves.
  // Cleared after each consumption so a manual state-dropdown change falls back to the first city.
  const pendingCityIdRef = useRef('');

  useEffect(() => {
    if (!area) return;
    setName(area.name);
    setPinCode(area.pinCode ?? '');
    setCoordinates({ latitude: area.latitude, longitude: area.longitude });
    setFieldErrors({});
    setError(null);
    pendingCityIdRef.current = area.city?.id ?? '';
    setStateId(area.city?.state?.id ?? '');

    // The areas list only expands `city`, not `city.state` — fetch the area
    // fresh with a full expand so the State dropdown can be pre-selected correctly.
    let cancelled = false;
    masterApi
      .getAreaById(area.id, ['*'])
      .then((full) => {
        if (cancelled) return;
        if (full.city?.id) pendingCityIdRef.current = full.city.id;
        if (full.city?.state?.id) setStateId(full.city.state.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [area]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      setCityId('');
      return;
    }
    setCitiesLoading(true);
    masterApi
      .getCitiesByState(stateId)
      .then((data) => {
        setCities(data);
        const pending = pendingCityIdRef.current;
        pendingCityIdRef.current = '';
        setCityId(data.some((c) => c.id === pending) ? pending : (data[0]?.id ?? ''));
      })
      .catch(() => setError('Failed to load cities for this state.'))
      .finally(() => setCitiesLoading(false));
  }, [area, stateId]);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area || !cityId) return;
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

    const patch: Parameters<typeof masterApi.updateArea>[1] = {};
    if (name.trim() !== area.name) patch.name = name.trim();
    if (pinCode.trim() !== (area.pinCode ?? '')) patch.pinCode = pinCode.trim() || undefined;
    if (coordinates.latitude !== area.latitude) patch.latitude = coordinates.latitude;
    if (coordinates.longitude !== area.longitude) patch.longitude = coordinates.longitude;
    if (cityId !== (area.city?.id ?? '')) patch.cityId = cityId;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await masterApi.updateArea(area.id, patch);
      onUpdated();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update area.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!area}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit area</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{area?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ea-state">State</Label>
            <select
              id="ea-state"
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
            <Label htmlFor="ea-city">City</Label>
            <select
              id="ea-city"
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
              htmlFor="ea-name"
              tip={AREA_NAME_TIP}
              className={fieldErrors.name ? 'text-destructive' : ''}
            >
              Name <span className="text-destructive">*</span>
            </LabelWithTip>
            <Input
              id="ea-name"
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
              htmlFor="ea-pincode"
              tip={AREA_PIN_CODE_TIP}
              className={fieldErrors.pinCode ? 'text-destructive' : ''}
            >
              Pin code <span className="text-muted-foreground font-normal">(optional)</span>
            </LabelWithTip>
            <Input
              id="ea-pincode"
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
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
