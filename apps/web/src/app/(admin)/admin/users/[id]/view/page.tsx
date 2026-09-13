'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi, bankDetailsApi, UserDetailVM, BankDetailVM } from '@repo/api';
import {
  ArrowLeft,
  AtSign,
  Building2,
  CreditCard,
  Mail,
  Pencil,
  Phone,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { SectionCard, DetailRow, PageLoading } from '@/components/common/admin/SectionCard';
import { TagList } from '@/components/common/admin/TagList';
import { UserAvatar } from '@/components/common/admin/UserAvatar';

function BoolBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        value
          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function AccountStatusBadges({ user }: { user: UserDetailVM }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 justify-end">
      <BoolBadge value={user.enabled} trueLabel="Active" falseLabel="Inactive" />
      {!user.accountNonLocked && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          Locked
        </span>
      )}
      {!user.accountNonExpired && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Expired
        </span>
      )}
      {!user.credentialsNonExpired && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Credentials expired
        </span>
      )}
    </div>
  );
}

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetailVM | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailVM[] | null>(null);

  useEffect(() => {
    usersApi
      .getUserById(id, ['roles', 'permissions'])
      .then((u) => {
        setUser(u);
        if (u.username) {
          bankDetailsApi
            .getByUsername(u.username)
            .then(setBankDetails)
            .catch(() => setBankDetails(null));
        } else {
          setBankDetails(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoading message="Loading user..." />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
          Back to users
        </Button>
      </div>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        description={user.username ? `@${user.username}` : 'User details'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={() => router.push(`/admin/users/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Identity" icon={UserIcon}>
          <DetailRow label="Avatar">
            <UserAvatar
              src={user.profilePicture}
              firstName={user.firstName}
              lastName={user.lastName}
              username={user.username}
              size={40}
            />
          </DetailRow>
          <DetailRow label="Full name">{fullName}</DetailRow>
          <DetailRow label="Email">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-xs">{user.emailId}</span>
              {user.emailIdVerified ? (
                <Mail className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Mail className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </span>
          </DetailRow>
          <DetailRow label="Username">
            <span className="font-mono text-xs">{user.username ?? '—'}</span>
          </DetailRow>
        </SectionCard>

        <SectionCard title="Account status" icon={Shield}>
          <DetailRow label="Status">
            <AccountStatusBadges user={user} />
          </DetailRow>
          <DetailRow label="Account locked">
            <BoolBadge value={!user.accountNonLocked} trueLabel="Locked" falseLabel="Not locked" />
          </DetailRow>
          <DetailRow label="Account expired">
            <BoolBadge value={!user.accountNonExpired} trueLabel="Expired" falseLabel="Valid" />
          </DetailRow>
          <DetailRow label="Credentials expired">
            <BoolBadge value={!user.credentialsNonExpired} trueLabel="Expired" falseLabel="Valid" />
          </DetailRow>
          <DetailRow label="Password set">
            <BoolBadge value={user.passwordSet ?? false} trueLabel="Yes" falseLabel="Not set" />
          </DetailRow>
          <DetailRow label="Force password change">
            <BoolBadge value={user.promptChangePassword} trueLabel="Yes" falseLabel="No" />
          </DetailRow>
        </SectionCard>

        <SectionCard title="Contact" icon={AtSign}>
          <DetailRow label="Mobile">
            <span className="inline-flex items-center gap-1.5">
              <span>{user.mobileNo ?? '—'}</span>
              {user.mobileNo && user.mobileNoVerified && (
                <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
            </span>
          </DetailRow>
          <DetailRow label="Email verified">
            <BoolBadge
              value={user.emailIdVerified}
              trueLabel="Verified"
              falseLabel="Not verified"
            />
          </DetailRow>
          <DetailRow label="Mobile verified">
            <BoolBadge
              value={user.mobileNoVerified}
              trueLabel="Verified"
              falseLabel="Not verified"
            />
          </DetailRow>
        </SectionCard>

        <SectionCard title="Roles & permissions" icon={Pencil}>
          <DetailRow label="Roles">
            <TagList
              variant="primary"
              max={3}
              tags={(user.roles ?? []).map((r) => ({ id: r.id, label: r.label }))}
            />
          </DetailRow>
          <DetailRow label="Permissions">
            <TagList
              variant="muted"
              max={3}
              tags={(user.permissions ?? []).map((p) => ({ id: p.id, label: p.label }))}
            />
          </DetailRow>
        </SectionCard>
      </div>

      {/* Bank details */}
      <SectionCard title="Bank details" icon={CreditCard}>
        {bankDetails === null ? (
          <div className="px-4 py-6">
            {user.username ? (
              <p className="text-sm text-muted-foreground">Failed to load bank details.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No username — bank details cannot be looked up.
              </p>
            )}
          </div>
        ) : bankDetails.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No bank accounts linked</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Bank
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Account No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    IFSC Code
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bankDetails.map((d) => (
                  <tr key={d.id} className={d.primary ? 'bg-primary/[0.03]' : 'hover:bg-muted/30'}>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground">{d.bank.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm text-foreground tracking-widest">
                        ••••&nbsp;{d.accountNo.slice(-4)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm text-foreground">{d.ifscCode}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {d.primary ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                          Primary
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
