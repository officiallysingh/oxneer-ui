import type { ReactNode } from 'react';
import type { UserDetailVM } from '@repo/api';
import { TagList } from '@/components/common/admin/TagList';
import { VerificationMark } from './VerificationMark';

/** Label/value grid used by the details drawer and the full profile page. */
export function DetailGrid({
  children,
  labelWidth = 110,
}: {
  children: ReactNode;
  labelWidth?: number;
}) {
  return (
    <dl
      className="grid items-center gap-3 text-sm"
      style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}
    >
      {children}
    </dl>
  );
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</dd>
    </>
  );
}

/** Email + mobile rows with verification badges. */
export function ContactDetailItems({ user }: { user: UserDetailVM }) {
  return (
    <>
      <DetailItem label="Email">
        <a href={`mailto:${user.emailId}`} className="truncate text-foreground hover:underline">
          {user.emailId}
        </a>
        <VerificationMark verified={user.emailIdVerified} subject="Email" variant="pill" />
      </DetailItem>
      <DetailItem label="Mobile">
        {user.mobileNo ? (
          <>
            <a href={`tel:${user.mobileNo}`} className="text-foreground hover:underline">
              {user.mobileNo}
            </a>
            <VerificationMark verified={user.mobileNoVerified} subject="Mobile" variant="pill" />
          </>
        ) : (
          <span className="text-muted-foreground">Not added</span>
        )}
      </DetailItem>
    </>
  );
}

/** Roles (info) and direct permissions (outline), or "none" notes. */
export function AccessDetailItems({ user }: { user: UserDetailVM }) {
  return (
    <>
      <DetailItem label="Roles">
        {user.roles?.length ? (
          <TagList
            tags={user.roles.map((r) => ({ id: r.id, label: r.label }))}
            variant="info"
            max={20}
          />
        ) : (
          <span className="text-[13px] text-muted-foreground">No roles assigned</span>
        )}
      </DetailItem>
      <DetailItem label="Direct permissions">
        {user.permissions?.length ? (
          <TagList
            tags={user.permissions.map((p) => ({ id: p.id, label: p.label }))}
            variant="outline"
            max={20}
          />
        ) : (
          <span className="text-[13px] text-muted-foreground">No direct permissions</span>
        )}
      </DetailItem>
    </>
  );
}
