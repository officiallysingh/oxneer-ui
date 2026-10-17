import { toast } from '@repo/ui';

/** Copies text and confirms with a toast, e.g. `copyText(role.name)`. */
export async function copyText(text: string, successMessage = `Copied ${text}`) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it manually.');
  }
}
