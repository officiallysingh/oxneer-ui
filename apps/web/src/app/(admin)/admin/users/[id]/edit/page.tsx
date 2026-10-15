'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { usersApi, type UserDetailVM } from '@repo/api';
import ErrorAlert from '@/components/common/admin/ErrorAlert';
import { PageLoading } from '@/components/common/admin/SectionCard';
import { UsersBreadcrumb } from '../../_components/UsersBreadcrumb';
import { UserIdentity } from '../../_components/UserIdentity';
import { UserStatusBadge } from '../../_components/UserStatusBadge';
import { UserForm } from '../../_components/user-form/UserForm';
import { fullName } from '../../_lib/user-display';
import { userToFormValues } from '../../_lib/user-form';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetailVM | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .getUserById(id, ['roles', 'permissions'])
      .then(setUser)
      .catch(() => setError('Failed to load user.'));
  }, [id]);

  if (error) return <ErrorAlert message={error} />;
  if (!user) return <PageLoading message="Loading user..." />;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <header className="flex flex-col gap-4">
        <UsersBreadcrumb current={fullName(user)} />
        <UserIdentity
          user={user}
          size="xl"
          as="h1"
          meta={
            <>
              <UserStatusBadge user={user} />
              <span className="text-[13px] text-muted-foreground">ID {user.id}</span>
            </>
          }
        />
      </header>
      <UserForm mode="edit" user={user} initialValues={userToFormValues(user)} />
    </div>
  );
}
