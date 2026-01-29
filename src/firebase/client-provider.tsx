'use client';

import React, { useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { BrandingProvider } from '@/context/BrandingProvider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Defer initialization to the client side by calling it inside useState.
  // This ensures it only runs once when the component is first rendered.
  const [firebaseServices] = useState(() => initializeFirebase());

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <BrandingProvider>
        {children}
      </BrandingProvider>
    </FirebaseProvider>
  );
}
