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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import { fullName } from '../_lib/user-display';
import type { UserRowHandlers } from './UserActionsMenu';
import { UserBankAccounts } from './UserBankAccounts';
import { UserIdentity } from './UserIdentity';
import { UserStatusBadge } from './UserStatusBadge';
import { AccessDetailItems, ContactDetailItems, DetailGrid, DetailItem } from './UserDetailParts';

interface UserDetailsSheetProps {
  /** The user to show; null closes the drawer. */
  user: UserDetailVM | null;
  handlers: UserRowHandlers;
  onClose: () => void;
}

const TAB_CONTENT = 'mt-0 flex flex-col gap-5 focus-visible:ring-offset-0';

/**
 * Right-hand drawer with a user's details in Overview / Access / Bank accounts tabs.
 * Disable / delete live in the row menu and on the full profile, not here.
 */
export function UserDetailsSheet({ user, handlers, onClose }: UserDetailsSheetProps) {
  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        {/* keyed so the tab resets to Overview for each user */}
        {user && <UserDetails key={user.id} user={user} handlers={handlers} />}
      </SheetContent>
    </Sheet>
  );
}

function UserDetails({ user, handlers }: { user: UserDetailVM; handlers: UserRowHandlers }) {
  const busy = handlers.busyIds.has(user.id);

  return (
    <>
      <SheetHeader className="space-y-0 px-6 py-5 pr-12 text-left">
        <SheetTitle className="sr-only">{fullName(user)}</SheetTitle>
        <SheetDescription className="sr-only">User details</SheetDescription>
        <UserIdentity
          user={user}
          size="lg"
          href={`/admin/users/${user.id}/view`}
          meta={<UserStatusBadge user={user} />}
        />
      </SheetHeader>

      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
        <div className="px-6 pb-3">
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="bank">Bank accounts</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 pt-2">
          <TabsContent value="overview" className={TAB_CONTENT}>
            <OverviewTab user={user} onManageAccess={() => handlers.onManageAccess(user)} />
          </TabsContent>
          <TabsContent value="access" className={TAB_CONTENT}>
            <AccessTab user={user} onManage={() => handlers.onManageAccess(user)} />
          </TabsContent>
          <TabsContent value="bank" className={TAB_CONTENT}>
            {user.username ? (
              <UserBankAccounts username={user.username} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                This user has no username, so bank accounts can’t be looked up.
              </p>
            )}
          </TabsContent>
        </div>
      </Tabs>

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

function OverviewTab({ user, onManageAccess }: { user: UserDetailVM; onManageAccess: () => void }) {
  return (
    <>
      <DrawerSection title="Contact">
        <DetailGrid>
          <ContactDetailItems user={user} />
        </DetailGrid>
      </DrawerSection>

      <DrawerSection title="Account">
        <DetailGrid>
          <DetailItem label="Enabled">{user.enabled ? 'Yes' : 'No'}</DetailItem>
          <DetailItem label="Locked">{user.accountNonLocked ? 'No' : 'Yes'}</DetailItem>
          {!user.accountNonExpired && <DetailItem label="Account expired">Yes</DetailItem>}
          <DetailItem label="Password">
            {user.credentialsNonExpired ? 'Valid' : 'Expired'}
            {user.promptChangePassword && (
              <span className="text-muted-foreground">· change at next sign-in</span>
            )}
          </DetailItem>
        </DetailGrid>
      </DrawerSection>

      <AccessTab user={user} onManage={onManageAccess} />
    </>
  );
}

function AccessTab({ user, onManage }: { user: UserDetailVM; onManage: () => void }) {
  return (
    <DrawerSection title="Access" onManage={onManage}>
      <DetailGrid labelWidth={130}>
        <AccessDetailItems user={user} />
      </DetailGrid>
    </DrawerSection>
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
