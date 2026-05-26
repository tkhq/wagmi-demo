'use client';

import { useEffect } from 'react';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { turnkeyBridge } from '@/lib/turnkey-bridge';

export function TurnkeyBridgeSync() {
  const { handleLogin, httpClient, session, wallets } = useTurnkey();

  useEffect(() => {
    turnkeyBridge.handleLogin = handleLogin;
    turnkeyBridge.httpClient = httpClient ?? null;
    turnkeyBridge.session = session ?? null;
    turnkeyBridge.wallets = wallets;

    if (session && wallets.length > 0 && turnkeyBridge._loginResolvers.length > 0) {
      turnkeyBridge.notifyAccountsReady();
    }
  }, [handleLogin, httpClient, session, wallets]);

  return null;
}
