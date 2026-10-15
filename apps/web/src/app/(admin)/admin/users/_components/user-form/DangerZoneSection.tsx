import { Button } from '@repo/ui';
import { FormSection } from '@/components/common/admin/FormSection';
import { SettingRow } from '@/components/common/admin/SettingRow';

interface DangerZoneSectionProps {
  onDelete: () => void;
  /** Why deleting isn't allowed, e.g. for a superadmin. */
  disabledReason?: string;
}

export function DangerZoneSection({ onDelete, disabledReason }: DangerZoneSectionProps) {
  return (
    <FormSection
      title="Danger zone"
      description="Permanent actions. Disabling the account is usually enough."
      tone="danger"
      dense
    >
      <SettingRow
        label="Delete this user"
        description={
          disabledReason ?? 'Removes the account and all its access. This can’t be undone.'
        }
        disabled={!!disabledReason}
        control={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={!!disabledReason}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete user…
          </Button>
        }
      />
    </FormSection>
  );
}
