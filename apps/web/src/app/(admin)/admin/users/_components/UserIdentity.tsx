import type { ReactNode } from 'react';
import Link from 'next/link';
import type { UserDetailVM } from '@repo/api';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { fullName } from '../_lib/user-display';

type IdentityUser = Pick<UserDetailVM, 'firstName' | 'lastName' | 'username' | 'profilePicture'>;

const SIZES = {
  sm: { avatar: 36, name: 'text-sm font-semibold', meta: 'text-[12.5px]' },
  md: { avatar: 40, name: 'text-sm font-semibold', meta: 'text-[12.5px]' },
  lg: { avatar: 52, name: 'font-display text-lg font-semibold', meta: 'text-[13px]' },
  xl: { avatar: 64, name: 'font-display text-[28px] font-semibold', meta: 'text-[13px]' },
};

interface UserIdentityProps {
  user: IdentityUser;
  size?: keyof typeof SIZES;
  /** Extra content next to the @username, e.g. a status badge. */
  meta?: ReactNode;
  /** Renders the name as a heading (drawers, page headers). */
  as?: 'div' | 'h1' | 'h2';
  /** Makes the name a link, e.g. to the full profile. */
  href?: string;
}

/** Avatar + full name + @username. */
export function UserIdentity({
  user,
  size = 'sm',
  meta,
  as: NameTag = 'div',
  href,
}: UserIdentityProps) {
  const s = SIZES[size];
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar
        src={user.profilePicture}
        firstName={user.firstName}
        lastName={user.lastName}
        username={user.username}
        size={s.avatar}
      />
      <div className="min-w-0">
        <NameTag className={`truncate text-foreground ${s.name}`}>
          {href ? (
            <Link href={href} className="hover:underline">
              {fullName(user)}
            </Link>
          ) : (
            fullName(user)
          )}
        </NameTag>
        <div className="flex flex-wrap items-center gap-2">
          {user.username && (
            <span className={`truncate text-muted-foreground ${s.meta}`}>@{user.username}</span>
          )}
          {meta}
        </div>
      </div>
    </div>
  );
}
