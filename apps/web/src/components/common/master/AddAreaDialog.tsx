'use client';

import { useEffect, useState } from 'react';
import { masterApi, CityVM, AreaVM } from '@repo/api';
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

interface AddAreaDialogProps {
  city: CityVM | null;
  onClose: () => void;
  onCreated: (cityId: string, areas: AreaVM[]) => void;
}

export function AddAreaDialog({ city, onClose, onCreated }: AddAreaDialogProps) {
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (city) {
      setName('');
      setPinCode('');
      setCoordinates({});
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
      await masterApi.createArea(city.id, {
        name: name.trim(),
        pinCode: pinCode.trim() || undefined,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      const areas = await masterApi.getAreasByCity(city.id);
      onCreated(city.id, areas);
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
      open={!!city}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add area</DialogTitle>
          <DialogDescription>
            Add an area to <span className="font-medium text-foreground">{city?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" disabled={saving}>
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
