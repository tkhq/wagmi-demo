'use server';

import { Turnkey } from '@turnkey/sdk-server';

import {
  SessionType,
  Session,
  OauthRequest,
  GetSuborgsRequest,
  GetSuborgsResponse,
  CreateSuborgRequest,
  GetOrCreateSuborgResponse,
  GetOrCreateSuborgRequest,
} from '@/lib/types';

const turnkeyClient = new Turnkey({
  apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
  defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
});

export async function oauth(
  request: OauthRequest
): Promise<Session | undefined> {
  try {
    const response = await turnkeyClient.apiClient().oauth({
      oidcToken: request.oidcToken,
      targetPublicKey: request.targetPublicKey,
      organizationId: request.suborgID,
      ...(request.sessionLengthSeconds !== undefined && {
        expirationSeconds: request.sessionLengthSeconds.toString(),
      }),
    });
    const { credentialBundle, apiKeyId, userId } = response;
    if (!credentialBundle || !apiKeyId || !userId) {
      throw new Error(
        'Expected non-null values for credentialBundle, apiKeyId, and userId.'
      );
    }
    const session: Session = {
      sessionType: SessionType.READ_WRITE,
      userId: userId,
      organizationId: request.suborgID,
      expiry: Date.now() + (request.sessionLengthSeconds ?? 900) * 1000,
      token: credentialBundle,
    };
    return session;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export async function getSuborgs(
  request: GetSuborgsRequest
): Promise<GetSuborgsResponse | undefined> {
  try {
    const response = await turnkeyClient.apiClient().getSubOrgIds({
      organizationId: turnkeyClient.config.defaultOrganizationId,
      filterType: request.filterType,
      filterValue: request.filterValue,
    });
    if (!response || !response.organizationIds) {
      throw new Error('Expected a non-null response with organizationIds.');
    }
    return { organizationIds: response.organizationIds };
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export async function getOrCreateSuborg(
  request: GetOrCreateSuborgRequest
): Promise<GetOrCreateSuborgResponse | undefined> {
  try {
    // Try to retrieve existing suborgs
    const suborgResponse = await getSuborgs({
      filterType: request.filterType,
      filterValue: request.filterValue,
    });
    if (
      suborgResponse &&
      suborgResponse.organizationIds &&
      suborgResponse.organizationIds.length > 0
    ) {
      return { subOrganizationIds: suborgResponse.organizationIds };
    }

    // No suborg exists, so create one using only OAuth data
    const createPayload: CreateSuborgRequest = {
      ...(request.additionalData?.oauthProviders && {
        oauthProviders: request.additionalData.oauthProviders,
      }),
    };
    const creationResponse = await turnkeyClient
      .apiClient()
      .createSuborg(createPayload);
    if (!creationResponse?.subOrganizationId) {
      throw new Error('Suborg creation failed');
    }
    return { subOrganizationIds: [creationResponse.subOrganizationId] };
  } catch (error) {
    console.error('Error in getOrCreateSuborg:', error);
    return undefined;
  }
}
