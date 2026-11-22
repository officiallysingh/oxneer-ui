'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { metadataApi, ComponentVM } from '@oxneer/api';
import { normalizeProperties, sanitizeProperties } from '../../../_components/types';
import { Loader2 } from 'lucide-react';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { ComponentForm, ComponentFormValues } from '../../_components/ComponentForm';

export default function EditComponentPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<ComponentFormValues | null>(null);
  const origRef = useRef<ComponentVM | null>(null);

  useEffect(() => {
    metadataApi
      .getComponentById(id)
      .then((comp) => {
        origRef.current = comp;
        setInitialValues({
          name: comp.name,
          description: comp.description ?? '',
          properties: normalizeProperties(comp.properties ?? []),
          tags: comp.tags ?? [],
        });
      })
      .catch(() => setLoadError('Failed to load component.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ComponentFormValues, original?: ComponentFormValues) => {
    const orig = origRef.current;
    if (!orig) return;

    const patch: Parameters<typeof metadataApi.updateComponent>[1] = {};
    if (values.name.trim() !== orig.name) patch.name = values.name.trim();
    if ((values.description.trim() || '') !== (orig.description ?? ''))
      patch.description = values.description.trim() || undefined;

    const propsChanged =
      JSON.stringify(values.properties) !== JSON.stringify(original?.properties ?? []);
    if (propsChanged) patch.properties = sanitizeProperties(values.properties);

    const tagsChanged =
      values.tags.length !== (orig.tags?.length ?? 0) ||
      values.tags.some((t, i) => t !== orig.tags?.[i]);
    if (tagsChanged) patch.tags = values.tags;

    await metadataApi.updateComponent(id, patch);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (loadError || !initialValues) {
    return (
      <div className="p-6">
        <ErrorAlert message={loadError ?? 'Failed to load.'} />
      </div>
    );
  }

  return (
    <ComponentForm
      initialValues={initialValues}
      original={initialValues}
      title="Edit component"
      description={`Editing: ${initialValues.name}`}
      submitLabel="Save changes"
      onSubmit={handleSubmit}
    />
  );
}
