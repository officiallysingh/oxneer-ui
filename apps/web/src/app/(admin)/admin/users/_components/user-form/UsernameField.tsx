'use client';

import { Check, Loader2 } from 'lucide-react';
import { FormField } from '@/components/common/admin/FormField';
import { USERNAME_RULES } from '@/lib/validation';
import type { NameAvailability } from '@/hooks/admin';
import type { UserFormState } from '../../_hooks/useUserForm';
import { suggestUsernames } from '../../_lib/user-form';

interface UsernameFieldProps {
  form: UserFormState;
  availability: NameAvailability;
}

/** Username input with live availability and name-based suggestions (create only). */
export function UsernameField({ form, availability }: UsernameFieldProps) {
  const { values, setField } = form;
  const username = values.username.trim();
  const taken = availability === 'taken';
  const suggestions = suggestUsernames(values.firstName, values.lastName).filter(
    (s) => s !== username,
  );
  const showSuggestions = suggestions.length > 0 && (!username || taken);
  const field = form.textField('username');

  return (
    <FormField
      {...field}
      error={field.error ?? (taken ? `@${username} is already taken` : undefined)}
      required
      prefix="@"
      autoComplete="username"
      placeholder="rajveer.singh"
      tip={USERNAME_RULES}
      hint="Used to sign in. Can’t be changed later."
      suffix={
        availability === 'checking' ? (
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-muted-foreground"
            aria-label="Checking"
          />
        ) : availability === 'available' ? (
          <span className="flex items-center gap-1 text-[12.5px] font-medium text-success">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Available
          </span>
        ) : null
      }
    >
      {showSuggestions && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-muted-foreground">
            {taken ? 'Try:' : 'Suggestions:'}
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setField('username', s)}
              className="h-7 rounded-full bg-secondary px-2.5 text-[13px] font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </FormField>
  );
}
