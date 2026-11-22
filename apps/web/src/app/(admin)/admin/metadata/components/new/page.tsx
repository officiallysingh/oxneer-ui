'use client';

import { metadataApi } from '@oxneer/api';
import { ComponentForm, ComponentFormValues } from '../_components/ComponentForm';
import { sanitizeProperties } from '../../_components/types';

export default function NewComponentPage() {
  const handleSubmit = async (values: ComponentFormValues) => {
    await metadataApi.createComponent({
      name: values.name.trim(),
      description: values.description.trim(),
      properties: sanitizeProperties(values.properties),
      tags: values.tags.length ? values.tags : undefined,
    });
  };

  return (
    <ComponentForm
      title="New component"
      description="Create a reusable property group"
      submitLabel="Create component"
      onSubmit={handleSubmit}
    />
  );
}
