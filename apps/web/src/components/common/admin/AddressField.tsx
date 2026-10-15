'use client';

import { useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Label } from '@repo/ui';
import { masterApi, AreaVM } from '@repo/api';
import { CoordinatesMapField } from './CoordinatesMapField';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddressValue {
  country?: string;
  pincode?: string;
  area?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  coordinates?: { latitude?: number; longitude?: number };
}

interface AddressFieldProps {
  value: unknown;
  onChange: (value: AddressValue) => void;
  disabled?: boolean;
}

// ── Shared input class ────────────────────────────────────────────────────────

const base =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60';

// ── Sub-label wrapper ─────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddressField({ value, onChange, disabled }: AddressFieldProps) {
  const addr: AddressValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as AddressValue)
      : {};

  const set = (key: keyof AddressValue, v: string) => onChange({ ...addr, [key]: v });

  // Pincode lookup state
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [areaOptions, setAreaOptions] = useState<AreaVM[]>([]);
  const [fetchedCity, setFetchedCity] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePincodeChange = (pin: string) => {
    // Update pincode immediately; clear derived fields and options
    onChange({ ...addr, pincode: pin, area: '', city: '', state: '' });
    setAreaOptions([]);
    setFetchedCity('');
    setPincodeError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      debounceRef.current = setTimeout(async () => {
        setPincodeLoading(true);
        try {
          // Call the new API to get the city by pincode
          const cityData = await masterApi.getCityByPinCode(pin);

          if (!cityData) {
            setPincodeError('No city found for this pincode.');
            setPincodeLoading(false);
            return;
          }

          const areas = cityData.areas ?? [];
          setAreaOptions(areas);

          const cityName = cityData.name ?? '';
          const stateName = cityData.state?.name ?? '';
          setFetchedCity(cityName);

          // Pre-fill state; leave area and city blank (unless only 1 area exists)
          if (areas.length === 1) {
            onChange({
              ...addr,
              pincode: pin,
              state: stateName,
              area: areas[0]?.name ?? '',
              city: cityName,
            });
          } else {
            onChange({
              ...addr,
              pincode: pin,
              state: stateName,
              area: '',
              city: '',
            });
          }
        } catch (err) {
          setPincodeError('Failed to look up pincode. Please fill in manually.');
        } finally {
          setPincodeLoading(false);
        }
      }, 500);
    }
  };

  const handleAreaChange = (areaName: string) => {
    const selectedArea = areaOptions.find((a) => a.name === areaName);
    const cityName = selectedArea?.city?.name || fetchedCity || '';
    onChange({
      ...addr,
      area: areaName,
      city: cityName,
    });
  };

  // Coordinates — stored as { latitude, longitude } object
  const coordObj =
    typeof addr.coordinates === 'object' && addr.coordinates !== null ? addr.coordinates : {};

  const setCoordinates = (coords: { latitude?: number; longitude?: number }) =>
    onChange({ ...addr, coordinates: coords });

  const autoFilled = !pincodeError && !pincodeLoading && addr.pincode?.length === 6 && !!addr.city;

  return (
    <div
      className={`rounded-lg border border-border bg-muted/10 p-4 space-y-4 ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Country */}
      <Field id="addr-country" label="Country">
        <select
          id="addr-country"
          value={addr.country ?? 'India'}
          onChange={(e) => set('country', e.target.value)}
          disabled={disabled}
          className={base}
        >
          <option value="India">India</option>
        </select>
      </Field>

      {/* Pincode */}
      <Field id="addr-pincode" label="Pincode" required>
        <div className="relative">
          <input
            id="addr-pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={addr.pincode ?? ''}
            onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
            placeholder="125076"
            disabled={disabled}
            className={`${base} pr-8`}
          />
          {pincodeLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        {pincodeError && <p className="text-xs text-warning mt-0.5">{pincodeError}</p>}
        {autoFilled && <p className="text-xs text-success mt-0.5">✓ City and state auto-filled</p>}
      </Field>

      {/* Area — dropdown when options available, plain text otherwise */}
      <Field id="addr-area" label="Area" required>
        {areaOptions.length > 0 ? (
          <select
            id="addr-area"
            value={addr.area ?? ''}
            onChange={(e) => handleAreaChange(e.target.value)}
            disabled={disabled}
            className={base}
          >
            <option value="">Select area…</option>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="addr-area"
            type="text"
            value={addr.area ?? ''}
            onChange={(e) => set('area', e.target.value)}
            placeholder="Andheri West"
            disabled={disabled}
            className={base}
          />
        )}
      </Field>

      {/* Town / City */}
      <Field id="addr-city" label="Town / City" required>
        <input
          id="addr-city"
          type="text"
          value={addr.city ?? ''}
          onChange={(e) => set('city', e.target.value)}
          placeholder="Sirsa"
          disabled={disabled}
          className={base}
        />
      </Field>

      {/* State */}
      <Field id="addr-state" label="State" required>
        <input
          id="addr-state"
          type="text"
          value={addr.state ?? ''}
          onChange={(e) => set('state', e.target.value)}
          placeholder="Haryana"
          disabled={disabled}
          className={base}
        />
      </Field>

      {/* Address Line 1 */}
      <Field id="addr-line1" label="Flat / House No. / Building / Company / Apartment" required>
        <input
          id="addr-line1"
          type="text"
          value={addr.addressLine1 ?? ''}
          onChange={(e) => set('addressLine1', e.target.value)}
          placeholder="Flat 4B, Sunrise Apartments"
          disabled={disabled}
          className={base}
        />
      </Field>

      {/* Address Line 2 */}
      <Field id="addr-line2" label="Street / Sector / Village" required>
        <input
          id="addr-line2"
          type="text"
          value={addr.addressLine2 ?? ''}
          onChange={(e) => set('addressLine2', e.target.value)}
          placeholder="Sector 12, Link Road"
          disabled={disabled}
          className={base}
        />
      </Field>

      {/* Landmark */}
      <Field id="addr-landmark" label="Landmark">
        <input
          id="addr-landmark"
          type="text"
          value={addr.landmark ?? ''}
          onChange={(e) => set('landmark', e.target.value)}
          placeholder="Near City Mall"
          disabled={disabled}
          className={base}
        />
      </Field>

      {/* Coordinates */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium text-muted-foreground">Location (Lat, Long)</Label>
        </div>
        <CoordinatesMapField value={coordObj} onChange={setCoordinates} disabled={disabled} />
      </div>
    </div>
  );
}
