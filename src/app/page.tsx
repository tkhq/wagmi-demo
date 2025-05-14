'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth-modal';
import { FilterType, useTurnkey } from '@turnkey/sdk-react';
import { server } from '@turnkey/sdk-server';
import { oauth } from '@/lib/actions';
import { SignMessage } from '@/components/sign-message';

export default function Home() {
  const { authIframeClient } = useTurnkey();
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

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
          const createSuborgData: Record<string, any> = {
            oauthProviders: [{ providerName: 'google', oidcToken: idToken }],
          };

          const resp = await server.getOrCreateSuborg({
            filterType: FilterType.OidcToken,
            filterValue: idToken,
            additionalData: createSuborgData,
          });

          const suborgIds = resp?.subOrganizationIds;
          if (!suborgIds || suborgIds.length === 0) {
            console.error('Failed to create suborg');
            return;
          }

          const suborgId = suborgIds[0];
          const iframePublicKey = await authIframeClient!.initEmbeddedKey();

          const session = await oauth({
            suborgID: suborgId!,
            oidcToken: idToken,
            targetPublicKey: iframePublicKey!,
            sessionLengthSeconds: 900,
          });
          if (session && session.token) {
            if (authIframeClient) {
              await authIframeClient.loginWithSession(session);
              console.log('OAuth login successful');
              setLoggedIn(true);
            } else {
              console.error('authIframeClient is undefined');
            }
          } else {
            console.error('OAuth login failed');
          }
        }}
      />
      {loggedIn && <SignMessage />}
    </div>
  );
}
