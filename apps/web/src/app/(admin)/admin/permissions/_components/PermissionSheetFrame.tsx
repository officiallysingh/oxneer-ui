import type { ReactNode } from 'react';
import { SheetDescription, SheetTitle } from '@repo/ui';

interface PermissionSheetFrameProps {
  title: string;
  description: string;
  formId: string;
  onSubmit: () => void;
  /** Footer buttons (and optional status on the left). */
  footer: ReactNode;
  children: ReactNode;
}

/** Header / scrolling form body / footer layout shared by the add and edit sheets. */
export function PermissionSheetFrame({
  title,
  description,
  formId,
  onSubmit,
  footer,
  children,
}: PermissionSheetFrameProps) {
  return (
    <form
      id={formId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b border-border px-6 py-5 pr-12">
        <SheetTitle className="font-display text-xl font-semibold">{title}</SheetTitle>
        <SheetDescription className="mt-1 text-[13px]">{description}</SheetDescription>
      </div>
      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-5">{children}</div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3.5">
        {footer}
      </div>
    </form>
  );
}
