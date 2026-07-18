'use client';

import { createContext, useContext } from 'react';

/**
 * Context providing a refresh function that re-fetches page data
 * from the server after a mutation (create, edit, delete, restore).
 */
export const RefreshContext = createContext<() => Promise<void>>(async () => {});

export function useRefresh() {
  return useContext(RefreshContext);
}