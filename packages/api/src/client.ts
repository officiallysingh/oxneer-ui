import axios from 'axios';

// Get base URL from environment or use a default
const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:8090';
};

/** Origin of the API — use it for non-axios calls, e.g. `fetch(\`${API_BASE}/logout\`)`. */
export const API_BASE = getBaseUrl();

/** sessionStorage key holding the error returned when the session expires (shown on /login). */
export const SESSION_ERROR_KEY = 'oxneer.session-error';

export function readSessionError(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SESSION_ERROR_KEY);
  } catch {
    return null;
  }
}

export function clearSessionError(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_ERROR_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Reads a human readable message out of an API error, keeping the server's
 * payload structure: plain text bodies, Spring problem-detail
 * (`{ status, title, detail, code }`) or constraint violations
 * (`{ violations: [{ propertyPath, detail }] }`).
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const response = (error as { response?: { data?: unknown } })?.response;
  const data = response?.data;

  if (typeof data === 'string') {
    const text = data.trim();
    if (text) {
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          return getApiErrorMessage({ response: { data: JSON.parse(text) } }, fallback);
        } catch {
          /* fall through to the raw text */
        }
      }
      return text;
    }
  }

  if (data && typeof data === 'object') {
    const payload = data as {
      detail?: string;
      title?: string;
      message?: string;
      violations?: { propertyPath?: string; detail?: string }[];
    };
    const violations = (payload.violations ?? [])
      .map((v) => v.detail)
      .filter((d): d is string => Boolean(d));
    if (violations.length) return violations.join(' ');
    if (payload.detail) return payload.detail;
    if (payload.message) return payload.message;
    if (payload.title) return payload.title;
  }

  const message = (error as Error)?.message;
  return message && message !== 'Network Error' ? message : fallback;
}

/** Fired on the window when the session has expired (see the response interceptor below). */
export const SESSION_ERROR_EVENT = 'oxneer:session-error';

/** Cheap authenticated endpoint used to tell an expired session from a permission denial. */
const SESSION_PROBE_PATH = '/api/v1/users/me/info';

/** True when a signed-in user is persisted — tells "session expired" from "not signed in". */
function hasSignedInUser(): boolean {
  try {
    const raw = window.localStorage.getItem('auth-store');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { user?: { authenticated?: boolean } } };
    return parsed.state?.user?.authenticated === true;
  } catch {
    return false;
  }
}

let redirectingToLogin = false;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Spring Security uses XSRF-TOKEN cookie and X-XSRF-TOKEN header by default
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let sessionProbe: Promise<boolean> | null = null;

/**
 * After a 403: is the session still valid? Spring answers 403 both for "not allowed"
 * (session fine) and for some expired-session cases, so ask a cheap authenticated endpoint.
 * Concurrent 403s share one probe. Network errors count as alive — never log out on a blip.
 */
function isSessionAlive(): Promise<boolean> {
  sessionProbe ??= axios
    .get(`${API_BASE}${SESSION_PROBE_PATH}`, { withCredentials: true })
    .then(
      () => true,
      (probeError) => {
        const status = probeError?.response?.status;
        return status !== 401 && status !== 403;
      },
    )
    .finally(() => {
      sessionProbe = null;
    });
  return sessionProbe;
}

/** Stores/announces the session error (shown as a toast and on /login), then redirects there. */
function handleSessionExpired(error: unknown, status: number) {
  const signedIn = hasSignedInUser();
  if (signedIn || status === 401) {
    const serverMessage = getApiErrorMessage(error, 'Please sign in again.');
    const message = signedIn
      ? `Your session has expired. ${serverMessage}`
      : `Please sign in to continue. ${serverMessage}`;

    try {
      window.sessionStorage.setItem(SESSION_ERROR_KEY, message);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(SESSION_ERROR_EVENT, { detail: message }));
  }

  if (!redirectingToLogin) {
    redirectingToLogin = true;
    // Give the toast a moment to render before the page unloads.
    window.setTimeout(() => {
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }, 1500);
  }
}

/**
 * 401 → session expired. 403 → only when the session probe also fails; otherwise it is a
 * permission denial and the error is left to the caller (no logout).
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const status: number | undefined = error.response?.status;
      const expired = status === 401 || (status === 403 && !(await isSessionAlive()));
      if (expired && status) handleSessionExpired(error, status);
    }
    return Promise.reject(error);
  },
);
