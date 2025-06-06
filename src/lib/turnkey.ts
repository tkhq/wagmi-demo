import { Turnkey, TurnkeyIframeClient } from '@turnkey/sdk-browser';

export const TurnkeyAuthIframeContainerId = 'turnkey-auth-iframe-container-id';
export const TurnkeyAuthIframeElementId = 'turnkey-auth-iframe-element-id';

let turnkeyClient: TurnkeyIframeClient | null = null;

export const getTurnkeyClient = async () => {
  if (!turnkeyClient) {
    console.group('🔑 [Turnkey] Client Initialization');
    console.log('Creating new Turnkey client...');
    console.log('Config:', {
      rpId: process.env.NEXT_PUBLIC_RPID,
      apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      orgId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
    });
    
    turnkeyClient = await new Turnkey({
      rpId: process.env.NEXT_PUBLIC_RPID!,
      apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
      defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
    }).iframeClient({
      iframeContainer: document.getElementById(TurnkeyAuthIframeContainerId),
      iframeUrl: 'https://auth.turnkey.com',
      iframeElementId: TurnkeyAuthIframeElementId,
    });

    console.log('Initializing embedded key...');
    await turnkeyClient!.initEmbeddedKey();
    console.log('✅ Turnkey client ready');
    console.groupEnd();
  }
  
  return turnkeyClient;
};
