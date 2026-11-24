import React from 'react';

import { cn } from '@oxneer/ui';
interface UserAvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  username?: string;
  size?: number;
  className?: string;
}

function initialsOf(firstName?: string, lastName?: string, username?: string) {
  const f = firstName?.trim()?.[0];
  const l = lastName?.trim()?.[0];
  if (f || l) return `${f ?? ''}${l ?? ''}`.toUpperCase();
  return username?.trim()?.[0]?.toUpperCase() ?? '?';
}

export function UserAvatar({
  src,
  firstName,
  lastName,
  username,
  size = 32,
  className = '',
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-medium',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initialsOf(firstName, lastName, username)}</span>
      )}
    </div>
  );
}
