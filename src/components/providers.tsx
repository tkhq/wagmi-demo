'use client';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  TurnkeyProvider,
  type CreateSubOrgParams,
} from '@turnkey/react-wallet-kit';
import { SolanaProvider } from '@/components/solana-provider';
import { TurnkeyBridgeSync } from '@/components/turnkey-bridge-sync';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const suborgParams = useMemo<CreateSubOrgParams>(
    () => ({
      userName: `User-${Date.now()}`,
      customWallet: {
        walletName: 'Default Wallet',
        walletAccounts: [
          {
            curve: 'CURVE_SECP256K1',
            pathFormat: 'PATH_FORMAT_BIP32',
            path: "m/44'/60'/0'/0/0",
            addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
          },
          {
            curve: 'CURVE_ED25519',
            pathFormat: 'PATH_FORMAT_BIP32',
            path: "m/44'/501'/0'/0'",
            addressFormat: 'ADDRESS_FORMAT_SOLANA',
          },
        ],
      },
    }),
    [],
  );

  return (
    <TurnkeyProvider
      config={{
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
        authProxyUrl:
          process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL ||
          'https://authproxy.turnkey.com',
        ui: {
          authModal: {
            methods: {
              walletAuthEnabled: false,
              smsOtpAuthEnabled: false,
              googleOauthEnabled: false,
              appleOauthEnabled: false,
              xOauthEnabled: false,
              discordOauthEnabled: false,
              facebookOauthEnabled: false,
            },
          },
        },
        auth: {
          createSuborgParams: {
            emailOtpAuth: suborgParams,
            passkeyAuth: suborgParams,
          },
        },
      }}
    >
      <TurnkeyBridgeSync />
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <SolanaProvider>{children}</SolanaProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </TurnkeyProvider>
  );
}
