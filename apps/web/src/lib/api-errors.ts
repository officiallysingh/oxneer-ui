/**
 * Parses the server's problem responses. Violations come in two shapes:
 *   { propertyPath: "user.emailId", detail: "must not be empty" }
 *   { code: "400", message: "must not be empty", details: "Invalid value for property subCategories" }
 *
 * Returns a map of { fieldName -> errorMessage }, a fallback general message,
 * and a one-line summary that always says what went wrong.
 */
export interface ApiViolation {
  propertyPath?: string;
  detail?: string;
  code?: string;
  message?: string;
  details?: string;
}

export interface ApiErrorResponse {
  title?: string;
  detail?: string;
  violations?: ApiViolation[];
}

export interface ParsedApiError {
  /** field -> message map, e.g. { emailId: "must not be empty" } */
  fieldErrors: Record<string, string>;
  /** top-level message when no violations or as fallback */
  general: string | null;
  /** Always set: every violation in one readable line, or the general message. */
  summary: string;
}

const UNEXPECTED = 'An unexpected error occurred. Please try again.';

/** "subCategories" → "Sub categories", "unit.openingPrice" → "Opening price". */
function readableField(path: string): string {
  const last = path.split('.').pop() ?? path;
  const words = last
    .replace(/\[\d+\]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function violationField(violation: ApiViolation): string | null {
  if (violation.propertyPath) return violation.propertyPath;
  const match = violation.details?.match(/property\s+([\w.[\]]+)/i);
  return match?.[1] ?? null;
}

export function parseApiError(err: unknown): ParsedApiError {
  const response = (err as { response?: { status?: number; data?: ApiErrorResponse } })?.response;
  const data = response?.data;

  if (!data || typeof data !== 'object') {
    // No problem body: a client-side error, or the server couldn't be reached.
    const message =
      err instanceof Error && err.message && !/^Request failed with status code/.test(err.message)
        ? err.message === 'Network Error'
          ? 'Can’t reach the server. Check your connection and try again.'
          : err.message
        : UNEXPECTED;
    return { fieldErrors: {}, general: message, summary: message };
  }

  const fieldErrors: Record<string, string> = {};
  const lines: string[] = [];

  for (const violation of data.violations ?? []) {
    const text = violation.detail ?? violation.message ?? '';
    const path = violationField(violation);
    if (path) {
      // Use the last segment of the path (e.g. "user.emailId" -> "emailId")
      const key =
        path
          .split('.')
          .pop()
          ?.replace(/\[\d+\]/g, '') ?? path;
      fieldErrors[key] = text || 'is not valid';
      lines.push(`${readableField(path)} ${text || 'is not valid'}`.trim());
    } else if (text) {
      lines.push(text);
    }
  }

  const fallback = data.detail ?? data.title ?? UNEXPECTED;
  const general = Object.keys(fieldErrors).length === 0 ? fallback : null;
  const summary = lines.length ? `${lines.join('. ')}.` : fallback;

  return { fieldErrors, general, summary };
}
