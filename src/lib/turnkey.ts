import { Turnkey, TurnkeyIframeClient } from '@turnkey/sdk-browser';

export const TurnkeyAuthIframeContainerId = 'turnkey-auth-iframe-container-id';
export const TurnkeyAuthIframeElementId = 'turnkey-auth-iframe-element-id';

let turnkeyClient: TurnkeyIframeClient | null = null;

export const getTurnkeyClient = async () => {
  if (!turnkeyClient) {
    turnkeyClient = await new Turnkey({
      rpId: process.env.NEXT_PUBLIC_RPID!,
      apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
      defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
    }).iframeClient({
      iframeContainer: document.getElementById(TurnkeyAuthIframeContainerId),
      iframeUrl: 'https://auth.turnkey.com',
      iframeElementId: TurnkeyAuthIframeElementId,
    });

    await turnkeyClient!.initEmbeddedKey();
  }
  return turnkeyClient;
};
