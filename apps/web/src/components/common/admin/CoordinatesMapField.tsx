'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react';

export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

interface CoordinatesMapFieldProps {
  value: unknown;
  onChange: (value: Coordinates) => void;
  /** Map height in pixels. Defaults to 420 — pass a smaller value for compact forms. */
  mapHeight?: number;
  disabled?: boolean;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const LeafletMap = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full flex items-center justify-center bg-muted/30">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

const inputBase =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60';
const numBase = `${inputBase} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

export function CoordinatesMapField({
  value,
  onChange,
  mapHeight,
  disabled,
}: CoordinatesMapFieldProps) {
  const coordObj =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const lat =
    typeof coordObj['latitude'] === 'number' ? (coordObj['latitude'] as number) : undefined;
  const lng =
    typeof coordObj['longitude'] === 'number' ? (coordObj['longitude'] as number) : undefined;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCoords = useCallback(
    (la: number, lo: number) => {
      onChange({ latitude: la, longitude: lo });
    },
    [onChange],
  );

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
      );
      const data = (await res.json()) as NominatimResult[];
      setResults(Array.isArray(data) ? data : []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 500);
  };

  const selectResult = (r: NominatimResult) => {
    setCoords(parseFloat(r.lat), parseFloat(r.lon));
    setQuery(r.display_name);
    setResults([]);
    setShowResults(false);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported by this browser.');
      return;
    }
    setLocateError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocateError('Could not get your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const updateManual = (latVal: string, lngVal: string) => {
    onChange({
      latitude: latVal !== '' ? parseFloat(latVal) : undefined,
      longitude: lngVal !== '' ? parseFloat(lngVal) : undefined,
    });
  };

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            placeholder="Search for a place or address…"
            disabled={disabled}
            className={`${inputBase} pl-8 pr-16`}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {!disabled && (
              <button
                type="button"
                onClick={locateMe}
                disabled={locating}
                title="Use my current location"
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50"
              >
                {locating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-[1001] mt-1 w-full rounded-md border border-border bg-background shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0 flex items-start gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
        {locateError && <p className="text-xs text-destructive mt-1">{locateError}</p>}
      </div>

      {/* Map */}
      <div className="rounded-md overflow-hidden border border-input">
        <LeafletMap latitude={lat} longitude={lng} onPick={setCoords} height={mapHeight} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click the map or drag the marker to set the location.
      </p>

      {/* Manual lat/lng */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            placeholder="Latitude"
            value={lat ?? ''}
            onChange={(e) => updateManual(e.target.value, lng != null ? String(lng) : '')}
            disabled={disabled}
            className={numBase}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
            lat
          </span>
        </div>
        <div className="flex-1 relative">
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            placeholder="Longitude"
            value={lng ?? ''}
            onChange={(e) => updateManual(lat != null ? String(lat) : '', e.target.value)}
            disabled={disabled}
            className={numBase}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none font-mono">
            lng
          </span>
        </div>
      </div>
    </div>
  );
}
