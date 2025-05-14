'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { TurnkeyProvider } from '@turnkey/sdk-react';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider
      config={{
        rpId: process.env.NEXT_PUBLIC_RPID!,
        apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
        defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </TurnkeyProvider>
  );
}
