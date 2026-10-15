import Link from 'next/link';

/** "Users › {current}" trail for the user sub-pages. */
export function UsersBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/admin/users" className="hover:text-foreground hover:underline">
            Users
          </Link>
        </li>
        <li aria-hidden>›</li>
        <li aria-current="page" className="truncate text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}
