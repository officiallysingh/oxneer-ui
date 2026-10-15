'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, KeyRound, Pencil } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@repo/ui';
import { TagList } from '@/components/common/admin/TagList';
import { fullName, isSuperAdmin } from '../_lib/user-display';
import type { UserRowHandlers } from './UserActionsMenu';
import { UserIdentity } from './UserIdentity';
import { UserStatusBadge } from './UserStatusBadge';
import { VerificationMark } from './VerificationMark';

interface UserDetailsSheetProps {
  /** The user to show; null closes the drawer. */
  user: UserDetailVM | null;
  handlers: UserRowHandlers;
  onClose: () => void;
}

/** Right-hand drawer with a user's contact, account and access details. */
export function UserDetailsSheet({ user, handlers, onClose }: UserDetailsSheetProps) {
  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        {user && <UserDetails user={user} handlers={handlers} />}
      </SheetContent>
    </Sheet>
  );
}

function UserDetails({ user, handlers }: { user: UserDetailVM; handlers: UserRowHandlers }) {
  const busy = handlers.busyIds.has(user.id);
  const superAdmin = isSuperAdmin(user);

  return (
    <>
      <SheetHeader className="space-y-0 px-6 py-5 pr-12 text-left">
        <SheetTitle className="sr-only">{fullName(user)}</SheetTitle>
        <SheetDescription className="sr-only">User details</SheetDescription>
        <UserIdentity user={user} size="lg" meta={<UserStatusBadge user={user} />} />
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto border-t border-border px-6 py-5">
        <DrawerSection title="Contact">
          <DetailGrid>
            <DetailItem label="Email">
              <span className="truncate">{user.emailId}</span>
              <VerificationMark verified={user.emailIdVerified} subject="Email" variant="pill" />
            </DetailItem>
            <DetailItem label="Mobile">
              {user.mobileNo ? (
                <>
                  {user.mobileNo}
                  <VerificationMark
                    verified={user.mobileNoVerified}
                    subject="Mobile"
                    variant="pill"
                  />
                </>
              ) : (
                <span className="text-muted-foreground">Not added</span>
              )}
            </DetailItem>
          </DetailGrid>
        </DrawerSection>

        <DrawerSection title="Account">
          <DetailGrid>
            <DetailItem label="Sign-in">{user.enabled ? 'Enabled' : 'Disabled'}</DetailItem>
            <DetailItem label="Password">
              {user.credentialsNonExpired ? 'Valid' : 'Expired'}
              {user.promptChangePassword && (
                <span className="text-muted-foreground">· change at next sign-in</span>
              )}
            </DetailItem>
            {!user.accountNonLocked && <DetailItem label="Lock">Locked</DetailItem>}
          </DetailGrid>
        </DrawerSection>

        <DrawerSection title="Roles" onManage={() => handlers.onManageAccess(user)}>
          {user.roles?.length ? (
            <TagList
              tags={user.roles.map((r) => ({ id: r.id, label: r.label }))}
              variant="info"
              max={20}
            />
          ) : (
            <p className="text-[13px] text-muted-foreground">No roles assigned</p>
          )}
        </DrawerSection>

        <DrawerSection title="Direct permissions" onManage={() => handlers.onManageAccess(user)}>
          {user.permissions?.length ? (
            <TagList
              tags={user.permissions.map((p) => ({ id: p.id, label: p.label }))}
              variant="outline"
              max={20}
            />
          ) : (
            <p className="text-[13px] text-muted-foreground">No direct permissions</p>
          )}
        </DrawerSection>

        <div className="flex flex-col gap-2.5 rounded-lg border border-destructive/35 p-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
            Danger zone
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handlers.onToggleEnabled(user)}
            >
              {user.enabled ? 'Disable account' : 'Enable account'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || superAdmin}
              onClick={() => handlers.onDelete(user)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {superAdmin ? 'Superadmin can’t be deleted' : 'Delete user…'}
            </Button>
          </div>
        </div>
      </div>

      <SheetFooter className="gap-2 border-t border-border px-6 py-4 sm:space-x-0">
        <Button variant="ghost" asChild className="sm:mr-auto">
          <Link href={`/admin/users/${user.id}/view`}>
            <ExternalLink />
            Full profile
          </Link>
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => handlers.onResetPassword(user)}>
          <KeyRound />
          Reset password
        </Button>
        <Button onClick={() => handlers.onEdit(user)}>
          <Pencil />
          Edit user
        </Button>
      </SheetFooter>
    </>
  );
}

function DrawerSection({
  title,
  onManage,
  children,
}: {
  title: string;
  onManage?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-5 last:border-b-0">
      <div className="flex items-center">
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {onManage && (
          <button
            type="button"
            onClick={onManage}
            className="text-[13px] font-medium text-primary underline underline-offset-4"
          >
            Manage
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 text-sm">{children}</dl>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</dd>
    </>
  );
}
