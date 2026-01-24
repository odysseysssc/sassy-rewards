'use client';

import { ReactNode } from 'react';
import { Web3Provider } from './Web3Provider';
import { AuthProvider } from './AuthProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Web3Provider>
        {children}
      </Web3Provider>
    </AuthProvider>
  );
}
