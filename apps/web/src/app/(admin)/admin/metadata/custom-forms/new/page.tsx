'use client';

import { metadataApi } from '@oxneer/api';
import { MetadataForm, MetadataFormValues } from '../../_components/MetadataForm';
import { sanitizeProperties } from '../../_components/types';

const TYPE = 'CUSTOM_FORM';

export default function NewCustomFormPage() {
  const handleSubmit = async (values: MetadataFormValues) => {
    await metadataApi.createManagedType({
      name: values.name.trim(),
      description: values.description.trim(),
      type: TYPE,
      properties: sanitizeProperties(values.properties),
      tags: values.tags.length ? values.tags : undefined,
    });
  };

  return (
    <MetadataForm
      title="New custom form"
      description="Create a new auction workflow step form template"
      submitLabel="Create form"
      backHref="/admin/metadata/custom-forms"
      fixedType={TYPE}
      onSubmit={handleSubmit}
    />
  );
}
