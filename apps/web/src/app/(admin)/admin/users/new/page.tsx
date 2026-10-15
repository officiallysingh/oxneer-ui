'use client';

import { UsersBreadcrumb } from '../_components/UsersBreadcrumb';
import { UserForm } from '../_components/user-form/UserForm';

export default function NewUserPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      <header className="flex flex-col gap-2.5">
        <UsersBreadcrumb current="Add user" />
        <div>
          <h1 className="font-display text-[28px] font-semibold text-foreground">Add user</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Fields marked <span className="text-destructive">*</span> are required. Everything else
            can be set later.
          </p>
        </div>
      </header>
      <UserForm mode="create" />
    </div>
  );
}
