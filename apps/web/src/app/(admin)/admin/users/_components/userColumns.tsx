'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import type { UserDetailVM } from '@repo/api';
import { Button, Checkbox } from '@repo/ui';
import Tip from '@/components/common/admin/Tip';
import { UserAccessTags } from './UserAccessTags';
import { UserActionsMenu, type UserRowHandlers } from './UserActionsMenu';
import { UserContact } from './UserContact';
import { UserIdentity } from './UserIdentity';
import { UserStatusBadge } from './UserStatusBadge';

/** Column ids `user` and `contact` are server-sortable (see useUsersList). */
export function buildUserColumns(handlers: UserRowHandlers): ColumnDef<UserDetailVM>[] {
  return [
    {
      id: 'select',
      size: 40,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all on page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${row.original.username ?? row.original.emailId}`}
        />
      ),
    },
    {
      id: 'user',
      accessorFn: (u) => u.username,
      header: 'User',
      size: 240,
      enableSorting: true,
      cell: ({ row }) => <UserIdentity user={row.original} />,
    },
    {
      id: 'contact',
      accessorFn: (u) => u.emailId,
      header: 'Contact',
      size: 280,
      enableSorting: true,
      cell: ({ row }) => <UserContact user={row.original} />,
    },
    {
      id: 'status',
      header: 'Status',
      size: 150,
      enableSorting: false,
      cell: ({ row }) => <UserStatusBadge user={row.original} />,
    },
    {
      id: 'access',
      header: 'Access',
      size: 220,
      enableSorting: false,
      cell: ({ row }) => <UserAccessTags user={row.original} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      size: 92,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-0.5">
          <Tip label="Edit user">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => handlers.onEdit(row.original)}
              aria-label={`Edit ${row.original.username ?? row.original.emailId}`}
            >
              <Pencil />
            </Button>
          </Tip>
          <UserActionsMenu user={row.original} handlers={handlers} />
        </div>
      ),
    },
  ];
}
