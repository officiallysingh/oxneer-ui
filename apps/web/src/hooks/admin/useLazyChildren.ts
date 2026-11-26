'use client';

import { useCallback, useRef, useState } from 'react';
import { toggleInSet } from '@/lib/tree-helpers';

interface LazyChildrenOptions<T> {
  load: (parentId: string) => Promise<T[]>;
  onError: (message: string) => void;
  loadErrorMessage: string;
}

/**
 * Expand/collapse state for a tree level whose children load the first time a
 * parent opens (cities of a state, areas of a city).
 */
export function useLazyChildren<T extends { id: string }>({
  load,
  onError,
  loadErrorMessage,
}: LazyChildrenOptions<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenByParent, setChildrenByParent] = useState<Record<string, T[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  // Parents whose children are loaded or loading, so opening one again doesn't refetch.
  const requestedRef = useRef(new Set<string>());

  const setChildren = useCallback((parentId: string, children: T[]) => {
    requestedRef.current.add(parentId);
    setChildrenByParent((prev) => ({ ...prev, [parentId]: children }));
  }, []);

  const fetchChildren = useCallback(
    async (parentId: string, errorMessage: string) => {
      requestedRef.current.add(parentId);
      setLoading((prev) => ({ ...prev, [parentId]: true }));
      try {
        setChildren(parentId, await load(parentId));
      } catch {
        requestedRef.current.delete(parentId); // let the next open retry
        onError(errorMessage);
      } finally {
        setLoading((prev) => ({ ...prev, [parentId]: false }));
      }
    },
    [load, onError, setChildren],
  );

  const toggle = useCallback(
    (parentId: string) => {
      setExpanded((prev) => toggleInSet(prev, parentId));
      if (!requestedRef.current.has(parentId)) void fetchChildren(parentId, loadErrorMessage);
    },
    [fetchChildren, loadErrorMessage],
  );

  /** Shows freshly created children and opens the parent. */
  const showChildren = useCallback(
    (parentId: string, children: T[]) => {
      setChildren(parentId, children);
      setExpanded((prev) => new Set(prev).add(parentId));
    },
    [setChildren],
  );

  const removeChild = useCallback((parentId: string, childId: string) => {
    setChildrenByParent((prev) => ({
      ...prev,
      [parentId]: (prev[parentId] ?? []).filter((child) => child.id !== childId),
    }));
  }, []);

  return {
    isExpanded: (parentId: string) => expanded.has(parentId),
    isLoading: (parentId: string) => !!loading[parentId],
    /** `undefined` until the parent has been opened once. */
    childrenOf: (parentId: string): T[] | undefined => childrenByParent[parentId],
    toggle,
    reload: fetchChildren,
    showChildren,
    removeChild,
  };
}

export type LazyChildren<T extends { id: string }> = ReturnType<typeof useLazyChildren<T>>;
