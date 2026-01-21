'use client';

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { BrandingSettings } from '@/types/branding';

interface BrandingContextType {
  settings: BrandingSettings;
  isLoading: boolean;
}

const defaultSettings: BrandingSettings = {
  id: 'branding',
  appName: 'Philos',
  logoIcon: 'Building2',
  primaryColor: '142.1 76.2% 36.3%', // Default from globals.css
};

const BrandingContext = createContext<BrandingContextType>({ settings: defaultSettings, isLoading: true });

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const brandingDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'branding') : null, [firestore]);
  const { data: settings, isLoading } = useDoc<BrandingSettings>(brandingDocRef);

  useEffect(() => {
    const color = settings?.primaryColor || defaultSettings.primaryColor;
    document.documentElement.style.setProperty('--primary', color);
  }, [settings]);

  const providedSettings = settings ?? defaultSettings;

  const value = useMemo(() => ({
    settings: providedSettings,
    isLoading,
  }), [providedSettings, isLoading]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
