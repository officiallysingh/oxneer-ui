import { useEffect, useRef, useState } from 'react';
import { metadataApi, type ManagedTypeVM, type PropertyDef } from '@repo/api';

/**
 * Fetches a managed type by ID and returns its properties.
 * Useful for FORM_STEP / PARTICIPATION_FORM_STEP workflow steps
 * and listings that reference a managed type.
 *
 * @param typeId - The managed type ID (string, Record, or falsy to skip)
 */
export function useManagedType(typeId: string | Record<string, string> | undefined | null) {
  const resolvedId =
    typeof typeId === 'object' && typeId !== null ? Object.keys(typeId)[0] : (typeId ?? '');

  const [managedType, setManagedType] = useState<ManagedTypeVM | null>(null);
  const [loading, setLoading] = useState(false);
  const prevId = useRef('');

  useEffect(() => {
    if (!resolvedId || resolvedId === prevId.current) return;
    prevId.current = resolvedId;
    let cancelled = false;

    const fetch_ = async () => {
      setLoading(true);
      try {
        const mt = await metadataApi.getManagedTypeById(resolvedId);
        if (!cancelled) setManagedType(mt);
      } catch {
        if (!cancelled) setManagedType(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch_();

    return () => {
      cancelled = true;
      prevId.current = '';
    };
  }, [resolvedId]);

  const properties: PropertyDef[] = managedType?.properties ?? [];

  return { managedType, properties, loading, typeId: resolvedId };
}
