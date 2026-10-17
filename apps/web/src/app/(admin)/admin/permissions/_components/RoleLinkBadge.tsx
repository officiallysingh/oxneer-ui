import Link from 'next/link';
import type { RoleVM } from '@repo/api';
import { roleEditHref } from '../_lib/permission-usage';

/** Role chip that opens the role in the Roles editor. */
export function RoleLinkBadge({ role }: { role: Pick<RoleVM, 'id' | 'label'> }) {
  return (
    <Link
      href={roleEditHref(role)}
      className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {role.label}
    </Link>
  );
}
