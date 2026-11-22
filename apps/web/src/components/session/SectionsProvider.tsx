'use client';

import { createContext, useContext } from 'react';
import { ALL_ON, type SectionsOn } from '@/lib/sections';

const Ctx = createContext<SectionsOn>(ALL_ON);

/** Shares the admin's site section switches with client components (menus, search, forms). */
export function SectionsProvider({
  value,
  children,
}: {
  value: SectionsOn;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSections = () => useContext(Ctx);
