'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { metadataApi, ManagedTypeVM } from '@oxneer/api';
import { sanitizeProperties, normalizeProperties } from '../../../_components/types';
import { Loader2 } from 'lucide-react';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { MetadataForm, MetadataFormValues } from '../../../_components/MetadataForm';

const TYPE = 'CUSTOM_FORM';

export default function EditCustomFormPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<MetadataFormValues | null>(null);
  const origRef = useRef<ManagedTypeVM | null>(null);

  useEffect(() => {
    metadataApi
      .getManagedTypeById(id)
      .then((mt) => {
        origRef.current = mt;
        setInitialValues({
          name: mt.name,
          description: mt.description ?? '',
          type: mt.type,
          properties: normalizeProperties(mt.properties ?? []),
          tags: mt.tags ?? [],
        });
      })
      .catch(() => setLoadError('Failed to load custom form.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: MetadataFormValues, original?: MetadataFormValues) => {
    const orig = origRef.current;
    if (!orig) return;

    const patch: Parameters<typeof metadataApi.updateManagedType>[1] = { type: TYPE };
    if (values.name.trim() !== orig.name) patch.name = values.name.trim();
    if ((values.description.trim() || '') !== (orig.description ?? ''))
      patch.description = values.description.trim() || undefined;
    const propsChanged =
      JSON.stringify(values.properties) !== JSON.stringify(orig.properties ?? []);
    if (propsChanged) patch.properties = sanitizeProperties(values.properties);

    const tagsChanged =
      values.tags.length !== (orig.tags?.length ?? 0) ||
      values.tags.some((t, i) => t !== orig.tags?.[i]);
    if (tagsChanged) patch.tags = values.tags;

    await metadataApi.updateManagedType(id, patch);
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
    <MetadataForm
      initialValues={initialValues}
      original={initialValues}
      title="Edit custom form"
      description={`Editing: ${initialValues.name}`}
      submitLabel="Save changes"
      backHref="/admin/metadata/custom-forms"
      fixedType={TYPE}
      onSubmit={handleSubmit}
    />
  );
}
