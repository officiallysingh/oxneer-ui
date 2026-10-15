import { usersApi } from '@repo/api';
import { downloadCsv } from '@/lib/csv';
import { fullName, getUserStatus } from './user-display';
import { toApiFilter, type UsersFilters } from './users-filters';

/** Upper bound for one export request. */
export const EXPORT_LIMIT = 5000;

const HEADER = [
  'Username',
  'Name',
  'Email',
  'Email verified',
  'Mobile',
  'Mobile verified',
  'Status',
  'Roles',
  'Permissions',
];

/** Downloads every user matching the filters (up to EXPORT_LIMIT) as CSV; resolves to the row count. */
export async function exportUsersCsv(filters: UsersFilters): Promise<number> {
  const res = await usersApi.getUsers({
    ...toApiFilter(filters),
    page: 0,
    size: EXPORT_LIMIT,
    expand: ['roles', 'permissions'],
  });
  const users = res.content ?? [];
  const rows = users.map((u) => [
    u.username,
    fullName(u),
    u.emailId,
    u.emailIdVerified,
    u.mobileNo,
    u.mobileNo ? u.mobileNoVerified : '',
    getUserStatus(u),
    (u.roles ?? []).map((r) => r.label).join('; '),
    (u.permissions ?? []).map((p) => p.label).join('; '),
  ]);
  downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, HEADER, rows);
  return users.length;
}
