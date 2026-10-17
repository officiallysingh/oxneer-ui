'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { usersApi, type UserDetailVM } from '@repo/api';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';
import { PageLoading } from '@/components/common/admin/SectionCard';
import { useBankAccounts } from '@/components/common/bank';
import { DeleteUserDialog } from '../../_components/DeleteUserDialog';
import type { UserRowHandlers } from '../../_components/UserActionsMenu';
import { UserBankAccountList } from '../../_components/UserBankAccounts';
import {
  AccessDetailItems,
  ContactDetailItems,
  DetailGrid,
  DetailItem,
} from '../../_components/UserDetailParts';
import { TabCount } from '@/components/common/admin/TabCount';
import { UsersBreadcrumb } from '../../_components/UsersBreadcrumb';
import { AccountHealthPanel } from '../../_components/user-profile/AccountHealthPanel';
import { ProfileCard } from '../../_components/user-profile/ProfileCard';
import { UserProfileHeader } from '../../_components/user-profile/UserProfileHeader';
import { useUserActions } from '../../_hooks/useUserActions';
import { fullName } from '../../_lib/user-display';

const USERS_PATH = '/admin/users';

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetailVM | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    usersApi
      .getUserById(id, ['roles', 'permissions'])
      .then(setUser)
      .catch(() => setNotFound(true));
  }, [id]);

  const bank = useBankAccounts(user?.username ? { username: user.username } : null);
  const actions = useUserActions({
    onUpdated: (_, patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
  });

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" asChild>
          <Link href={USERS_PATH}>Back to users</Link>
        </Button>
      </div>
    );
  }
  if (!user) return <PageLoading message="Loading user..." />;

  const editPath = `${USERS_PATH}/${user.id}/edit`;
  const handlers: Omit<UserRowHandlers, 'onView'> = {
    onEdit: () => router.push(editPath),
    onManageAccess: () => router.push(`${editPath}#access`),
    onResetPassword: actions.resetPassword,
    onToggleEnabled: (u) => actions.setEnabled([u], !u.enabled),
    onUnlock: actions.unlock,
    onDelete: () => setConfirmDelete(true),
    busyIds: actions.busyIds,
  };
  const accessCount = (user.roles?.length ?? 0) + (user.permissions?.length ?? 0);
  const bankCount = bank.isLoading ? undefined : bank.accounts.length;

  const profileCard = (
    <ProfileCard title="Profile & contact" action={{ label: 'Edit', href: editPath }}>
      <DetailGrid labelWidth={160}>
        <DetailItem label="Full name">
          <span className="font-medium">{fullName(user)}</span>
        </DetailItem>
        <DetailItem label="Username">@{user.username ?? '—'}</DetailItem>
        <ContactDetailItems user={user} />
      </DetailGrid>
    </ProfileCard>
  );
  const accessCard = (
    <ProfileCard title="Access" action={{ label: 'Manage access', href: `${editPath}#access` }}>
      <DetailGrid labelWidth={160}>
        <AccessDetailItems user={user} />
      </DetailGrid>
    </ProfileCard>
  );
  const bankCard = (
    <ProfileCard title="Bank accounts">
      <UserBankAccountList accounts={bank.accounts} isLoading={bank.isLoading} error={bank.error} />
    </ProfileCard>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5">
      <UsersBreadcrumb current={fullName(user)} />
      <UserProfileHeader user={user} handlers={handlers} />

      {user.passwordSet === false && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/[0.08] px-4 py-3.5"
        >
          <Lock className="h-[18px] w-[18px] shrink-0 text-warning" aria-hidden />
          <div className="flex-[1_1_300px]">
            <p className="font-semibold">No password set</p>
            <p className="text-[12.5px] text-muted-foreground">
              The user can’t sign in with a password until they set one.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={actions.busyIds.has(user.id)}
            onClick={() => actions.resetPassword(user)}
          >
            Send set-password link
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview" className="flex flex-col gap-5">
        <TabsList className="h-10 self-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access" className="group gap-2">
            Access <TabCount n={accessCount} />
          </TabsTrigger>
          <TabsTrigger value="bank" className="group gap-2">
            Bank accounts <TabCount n={bankCount} />
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col">
            <TabsContent value="overview" className="mt-0 flex flex-col gap-5">
              {profileCard}
              {accessCard}
              {bankCard}
            </TabsContent>
            <TabsContent value="access" className="mt-0">
              {accessCard}
            </TabsContent>
            <TabsContent value="bank" className="mt-0">
              {bankCard}
            </TabsContent>
          </div>
          <AccountHealthPanel user={user} />
        </div>
      </Tabs>

      <DeleteUserDialog
        user={confirmDelete ? user : null}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async (u) => {
          const deleted = await actions.deleteUser(u);
          if (deleted) router.push(USERS_PATH);
          return deleted;
        }}
      />
    </div>
  );
}
