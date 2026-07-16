'use client';

import { useState, useEffect, type ReactNode } from 'react';

/**
 * Defers rendering its children until after the initial mount.
 * This prevents React state update warnings from useReactTable
 * and other hooks that call setState during initialization.
 */
export function DeferredMount({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}