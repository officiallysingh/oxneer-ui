'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@repo/ui';
import { PaginationBar } from '@/components/common/admin/PaginationBar';

interface UsersMobileFooterProps {
  onAddUser: () => void;
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  itemCount: number;
  totalRecords: number;
  onPageChange: (pageIndex: number) => void;
  isLoading: boolean;
}

/** Phone footer pinned to the bottom: Add user + "X–Y of Z" + prev/next (44px targets). */
export function UsersMobileFooter({ onAddUser, ...pagination }: UsersMobileFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center gap-2 border-t border-border bg-card px-4 py-2.5">
      <Button className="h-11" onClick={onAddUser}>
        <UserPlus />
        Add user
      </Button>
      <PaginationBar variant="compact" className="flex-1" {...pagination} />
    </div>
  );
}
