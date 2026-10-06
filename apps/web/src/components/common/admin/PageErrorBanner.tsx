'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, X } from 'lucide-react';

interface BannerEntry {
  id: number;
  message: string;
}

interface PageErrorContextValue {
  report: (message: string) => number;
  clear: (id: number) => void;
}

const PageErrorContext = createContext<PageErrorContextValue | null>(null);

export function usePageErrorBanner() {
  return useContext(PageErrorContext);
}

export function PageErrorProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<BannerEntry | null>(null);
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const idRef = useState(() => ({ n: 0 }))[0];

  const report = useCallback((message: string) => {
    const id = ++idRef.n;
    setCurrent({ id, message });
    setDismissedId(null);
    return id;
  }, [idRef]);

  const clear = useCallback((id: number) => {
    setCurrent((entry) => (entry?.id === id ? null : entry));
  }, []);

  const value = useMemo(() => ({ report, clear }), [report, clear]);
  const visible = current && current.id !== dismissedId ? current : null;

  return (
    <PageErrorContext.Provider value={value}>
      {visible && (
        <div className="shrink-0 px-6 pt-4">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 border-l-4 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 font-body leading-5">{visible.message}</p>
            <button
              type="button"
              onClick={() => setDismissedId(visible.id)}
              className="rounded-md p-1 text-destructive/80 hover:bg-destructive/15 hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {children}
    </PageErrorContext.Provider>
  );
}
