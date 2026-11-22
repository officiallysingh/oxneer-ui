'use client';

import { metadataApi } from '@oxneer/api';
import { MetadataForm, MetadataFormValues } from '../../_components/MetadataForm';
import { sanitizeProperties } from '../../_components/types';

const TYPE = 'CATALOGUE';

export default function NewListingCatalogPage() {
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
      title="New listing catalog"
      description="Create a new listing catalog template"
      submitLabel="Create catalog"
      backHref="/admin/metadata/listing-catalogs"
      fixedType={TYPE}
      onSubmit={handleSubmit}
    />
  );
}
