'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth-modal';
import { FilterType } from '@turnkey/sdk-react';
import { DEFAULT_ETHEREUM_ACCOUNTS, server } from '@turnkey/sdk-server';
import { oauth } from '@/lib/actions';
import { SignMessage } from '@/components/sign-message';
import { SendTransaction } from '@/components/send-transaction';
import { useConnect } from 'wagmi';
import { getTurnkeyClient } from '@/lib/turnkey';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SolanaAccount } from '@/components/account.solana';
import { EthereumAccount } from '@/components/account.ethereum';
import { SignMessageSolana } from '@/components/sign-message.solana';
import { SendTransactionSolana } from '@/components/send-transaction.solana';

const SOLANA_ACCOUNT = {
  curve: 'CURVE_ED25519' as const,
  pathFormat: 'PATH_FORMAT_BIP32' as const,
  path: "m/44'/501'/0'/0'",
  addressFormat: 'ADDRESS_FORMAT_SOLANA' as const,
};

export default function Home() {
  const { connectors, connect, status, error } = useConnect();
  const { connection } = useConnection();
  const {
    publicKey,
    connect: connectSolanaWallet,
    select,
    wallets,
    wallet,
    signMessage: signSolMessage,
  } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    console.log('connector status', status);
    console.log('connector error', error);
    console.log('solana connection', connection);
    console.log('solana public key', publicKey);
    console.log('solana wallet', wallet);
  }, [status, connection, publicKey, wallet]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-[#7C3AED] hover:bg-[#6D28D9]"
      >
        Open Auth Modal
      </Button>
      <AuthModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onGoogleSuccess={async (idToken) => {
          const resp = await server.getOrCreateSuborg({
            filterType: FilterType.OidcToken,
            filterValue: idToken,
            additionalData: {
              customAccounts: [SOLANA_ACCOUNT, DEFAULT_ETHEREUM_ACCOUNTS[0]],
              oauthProviders: [{ providerName: 'google', oidcToken: idToken }],
            },
          });

          const suborgIds = resp?.subOrganizationIds;
          if (!suborgIds || suborgIds.length === 0) {
            console.error('Failed to create suborg');
            return;
          }

          console.log('suborgIds', suborgIds);

          const suborgId = suborgIds[0];
          const client = await getTurnkeyClient();
          const iframePublicKey = client?.iframePublicKey;

          if (!iframePublicKey) {
            console.error('iframePublicKey is undefined');
            return;
          }

          const session = await oauth({
            suborgID: suborgId!,
            oidcToken: idToken,
            targetPublicKey: iframePublicKey,
            sessionLengthSeconds: 900,
          });
          if (session && session.token) {
            if (client) {
              await client.loginWithSession(session);
              // Connect wagmi wallet
              const turnkeyConnector = connectors.find(
                (c) => c.id === 'turnkey'
              );

              if (turnkeyConnector) {
                console.log('connecting with turnkeyConnector');
                connect({ connector: turnkeyConnector });
              }

              // Connect solana wallet
              console.log(
                'connecting with solana wallet; solana wallets',
                wallets
              );
              const turnkeyWallet = wallets.find(
                (w) => w.adapter.name === 'Turnkey'
              );
              if (!turnkeyWallet) {
                console.error('Turnkey wallet not found');
                return;
              }
              select(turnkeyWallet.adapter.name);
              connectSolanaWallet();

              setLoggedIn(true);
            } else {
              console.error('authIframeClient is undefined');
            }
          } else {
            console.error('OAuth login failed');
          }
          setIsOpen(false);
        }}
      />
      {loggedIn && (
        <div className="flex gap-4">
          <div className="space-y-4">
            <SolanaAccount />
            <SignMessageSolana />
            <SendTransactionSolana />
          </div>
          <div className="space-y-4">
            <EthereumAccount />
            <SignMessage />
            <SendTransaction />
          </div>
        </div>
      )}
    </div>
  );
}
