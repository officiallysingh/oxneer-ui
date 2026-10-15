import type { UserDetailVM } from '@repo/api';
import { VerificationMark } from './VerificationMark';

/** Email + mobile, each with its verification mark. */
export function UserContact({
  user,
}: {
  user: Pick<UserDetailVM, 'emailId' | 'emailIdVerified' | 'mobileNo' | 'mobileNoVerified'>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
        <span className="truncate">{user.emailId}</span>
        <VerificationMark verified={user.emailIdVerified} subject="Email" />
      </div>
      {user.mobileNo && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {user.mobileNo}
          <VerificationMark verified={user.mobileNoVerified} subject="Mobile" />
        </div>
      )}
    </div>
  );
}
