import type { UserDetailVM } from '@repo/api';
import { TagList } from '@/components/common/admin/TagList';

/** Roles (info) then direct permissions (outline), collapsed after `max`. */
export function UserAccessTags({
  user,
  max = 2,
}: {
  user: Pick<UserDetailVM, 'roles' | 'permissions'>;
  max?: number;
}) {
  const tags = [
    ...(user.roles ?? []).map((r) => ({
      id: `role:${r.id}`,
      label: r.label,
      variant: 'info' as const,
    })),
    ...(user.permissions ?? []).map((p) => ({
      id: `perm:${p.id}`,
      label: p.label,
      variant: 'outline' as const,
    })),
  ];
  return <TagList tags={tags} max={max} />;
}
