'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  listingsApi,
  masterApi,
  metadataApi,
  ListingVM,
  ListingCategoryRef,
  CategoryVM,
  ManagedTypeVM,
} from '@repo/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/authStore';
import { ListingStepIndicator } from '@/components/common/wizard/ListingStepIndicator';
import { Step1Details, ListingDetails } from '../../_components/Step1Details';
import { Step2Media } from '../../_components/Step2Media';
import { Step3Catalog } from '../../_components/Step3Catalog';
import { buildPathWiseState } from '@/lib/pathWiseState';

type EmbeddedProp = { type?: string; name?: string; value?: unknown };

function propsToFieldValues(properties: EmbeddedProp[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const prop of properties) {
    if (!prop.name) continue;
    if (prop.type === 'COMPOSITE_PROPERTY') {
      const children = Array.isArray(prop.value) ? (prop.value as EmbeddedProp[]) : [];
      result[prop.name] = propsToFieldValues(children);
    } else if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
      result[prop.name] = Array.isArray(prop.value) ? prop.value : [];
    } else {
      result[prop.name] = prop.value ?? '';
    }
  }
  return result;
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const username = user?.username ?? 'unknown';

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const origRef = useRef<ListingVM | null>(null);
  const origCatalogRef = useRef<{ managedTypeId: string; fieldValues: Record<string, unknown> }>({
    managedTypeId: '',
    fieldValues: {},
  });

  // Step 1 state
  const [details, setDetails] = useState<ListingDetails>({
    name: '',
    description: '',
    categoryId: '',
    subCategory: '',
    tags: [],
    quantity: 0,
  });
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 state
  const [uploads, setUploads] = useState<Parameters<typeof Step2Media>[0]['uploads']>([]);

  // Step 3 state
  const [managedTypeId, setManagedTypeId] = useState('');
  const [selectedManagedType, setSelectedManagedType] = useState<ManagedTypeVM | null>(null);
  const [loadingType, setLoadingType] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [step3Saving, setStep3Saving] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  const hasChanges = () => {
    const orig = origRef.current;
    if (!orig) return true;
    if (details.name.trim() !== orig.name) return true;
    if ((details.description.trim() || '') !== (orig.description ?? '')) return true;
    if (
      details.tags.length !== (orig.tags?.length ?? 0) ||
      details.tags.some((t: string, i: number) => t !== orig.tags?.[i])
    )
      return true;
    const origSubCatId =
      typeof orig.subCategory === 'object' && orig.subCategory !== null
        ? (orig.subCategory as ListingCategoryRef).id
        : ((orig.subCategory as string | undefined) ?? '');
    if (details.subCategory !== origSubCatId) return true;
    if (details.quantity !== (orig.quantity?.available ?? 0)) return true;
    return false;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  useEffect(() => {
    Promise.all([listingsApi.getListingById(id), masterApi.getCategories(true)])
      .then(([listing, cats]) => {
        origRef.current = listing;
        setCategories(cats);

        // Load Step 1 details
        // API returns subCategory as an object {id,name,icon} — extract the id
        const subCatId =
          typeof listing.subCategory === 'object' && listing.subCategory !== null
            ? (listing.subCategory as ListingCategoryRef).id
            : ((listing.subCategory as string | undefined) ?? '');
        const ownerCat = cats.find((c) => c.subCategories?.some((s) => s.id === subCatId));
        setDetails({
          name: listing.name,
          description: listing.description ?? '',
          categoryId: ownerCat?.id ?? '',
          subCategory: subCatId,
          tags: listing.tags ?? [],
          quantity: listing.quantity?.available ?? 0,
        });

        // Load Step 3 data
        const embedded = listing.embedded as Record<string, unknown> | undefined;
        if (embedded) {
          const typeId = embedded.typeId as string;
          if (typeId) {
            const properties = Array.isArray(embedded.properties)
              ? (embedded.properties as EmbeddedProp[])
              : [];
            const loadedFieldValues = propsToFieldValues(properties);
            setManagedTypeId(typeId);
            setFieldValues(loadedFieldValues);
            origCatalogRef.current = { managedTypeId: typeId, fieldValues: loadedFieldValues };
            // Fetch full type schema to render fields
            setLoadingType(true);
            metadataApi
              .getManagedTypeById(typeId)
              .then(setSelectedManagedType)
              .catch(() => {})
              .finally(() => setLoadingType(false));
          }
        }
      })
      .catch(() => setStep1Error('Failed to load listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Step 1: update listing details ────────────────────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!details.name.trim()) errs.name = 'Name is required.';
    if (!details.subCategory) errs.subCategory = 'Sub-category is required.';
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep1Error(null);
    try {
      const orig = origRef.current;
      if (!orig) return;

      const patch: Record<string, unknown> = { subCategory: details.subCategory };
      if (details.name.trim() !== orig.name) patch.name = details.name.trim();
      if ((details.description.trim() || '') !== (orig.description ?? ''))
        patch.description = details.description.trim() || undefined;
      const tagsChanged =
        details.tags.length !== (orig.tags?.length ?? 0) ||
        details.tags.some((t: string, i: number) => t !== orig.tags?.[i]);
      if (tagsChanged) patch.tags = details.tags;
      if (details.quantity !== (orig.quantity?.available ?? 0)) patch.quantity = details.quantity;

      if (Object.keys(patch).length > 0) {
        await listingsApi.updateListing(id, patch as never);
      }
      origRef.current = {
        ...orig,
        ...patch,
        ...(patch.quantity !== undefined
          ? { quantity: { ...(orig.quantity ?? {}), available: patch.quantity as number } }
          : {}),
      } as ListingVM;
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1Error(parsed.general ?? 'Failed to save listing.');
    }
  };

  // ── Step 3: patch listing with embedded struct ────────────────────────────
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3Error(null);
    if (!managedTypeId) {
      setStep3Error('Please select a type definition.');
      return;
    }
    setStep3Saving(true);
    try {
      const pathWiseState = buildPathWiseState(fieldValues, selectedManagedType);
      await listingsApi.updateListing(id, {
        embedded: { typeId: managedTypeId, pathWiseState },
      });
      router.push('/admin/listings');
    } catch (err) {
      const parsed = parseApiError(err);
      setStep3Error(parsed.general ?? 'Failed to update listing.');
    } finally {
      setStep3Saving(false);
    }
  };

  const handleTypeChange = async (mid: string) => {
    if (mid !== managedTypeId) setFieldValues({});
    setManagedTypeId(mid);
    if (!mid) {
      setSelectedManagedType(null);
      return;
    }
    setLoadingType(true);
    try {
      setSelectedManagedType(await metadataApi.getManagedTypeById(mid));
    } catch {
      setSelectedManagedType(null);
    } finally {
      setLoadingType(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit listing"
        description={details.name ? `Editing: ${details.name}` : 'Update listing details'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <ListingStepIndicator current={step} editMode onStepClick={setStep} />

      {step === 1 && (
        <>
          {step1Error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {step1Error}
            </div>
          )}
          <Step1Details
            values={details}
            onChange={(patch: Partial<ListingDetails>) => setDetails((p) => ({ ...p, ...patch }))}
            categories={categories}
            fieldErrors={step1Errors}
            onNext={handleStep1}
            onSkip={!hasChanges() ? () => setStep(2) : undefined}
            onCancel={() => router.push('/admin/listings')}
          />
        </>
      )}

      {step === 2 && (
        <Step2Media
          listingId={id}
          username={username}
          uploads={uploads}
          onUploadsChange={setUploads}
          onSave={async (blobIds, blobProperties) => {
            await listingsApi.updateListing(id, {
              blobs: blobIds,
              ...(Object.keys(blobProperties).length ? { blobProperties } : {}),
            });
          }}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          onCancel={() => router.push('/admin/listings')}
        />
      )}

      {step === 3 && (
        <Step3Catalog
          managedTypeId={managedTypeId}
          selectedManagedType={selectedManagedType}
          loadingType={loadingType}
          fieldValues={fieldValues}
          onTypeChange={handleTypeChange}
          onFieldChange={(name: string, value: unknown) =>
            setFieldValues((p) => ({ ...p, [name]: value }))
          }
          onSubmit={handleStep3}
          onBack={() => setStep(2)}
          onCancel={() => router.push('/admin/listings')}
          onSkip={
            managedTypeId === origCatalogRef.current.managedTypeId &&
            JSON.stringify(fieldValues) === JSON.stringify(origCatalogRef.current.fieldValues)
              ? () => router.push('/admin/listings')
              : undefined
          }
          saving={step3Saving}
          error={step3Error}
        />
      )}
    </div>
  );
}
