import {
  EIP1193Provider,
  EIP1193RequestFn,
  EIP1474Methods,
  WalletRpcSchema,
  pad,
  getAddress,
  RpcRequestError,
  Hex,
} from 'viem';

import EventEmitter from 'events';
import { getTurnkeyClient } from './turnkey';
import { holesky } from 'viem/chains';
import { getHttpRpcClient } from 'viem/utils';
import { serializeSignature } from 'viem';
interface ProviderStore {
  accounts: string[];
  organizationId?: string;
}

export async function createEIP1193Provider(): Promise<EIP1193Provider> {
  const eventEmitter = new EventEmitter();

  const session = JSON.parse(
    localStorage.getItem('@turnkey/session/v2') || '{}'
  );

  const client = await getTurnkeyClient();
  if (!client) {
    throw new Error('Iframe client is not defined');
  }
  await client.loginWithSession(session).catch((e) => {
    console.error('Failed to login with session', e);
  });
  /**
   * Request queue for handling RPC requests
   * @type {Object}
   * @property {Object} [method: string] - The method name
   * @property {Function} resolve - The resolve function
   * @property {Function} reject - The reject function
   */
  const requestQueue: {
    [method: string]: {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    };
  } = {};

  const STORAGE_KEY = 'TK:EIP1193Provider:store';

  const getStore = (): ProviderStore => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? JSON.parse(stored)
      : { accounts: [], organizationId: undefined };
  };

  const updateStore = (updates: Partial<ProviderStore>) => {
    const currentStore = getStore();
    const newStore = { ...currentStore, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStore));

    // Emit events only if values have changed
    if (
      updates.accounts &&
      JSON.stringify(updates.accounts) !== JSON.stringify(currentStore.accounts)
    ) {
      eventEmitter.emit('accountsChanged', updates.accounts);
    }
  };

  const updateAccounts = (accounts: string[]) => {
    updateStore({ accounts });
  };

  const updateOrganization = (organizationId: string) => {
    updateStore({ organizationId });
  };

  const handleMessage = (event: MessageEvent) => {
    const { method, result, error } = event.data;

    // Handle RPC responses using method name
    if (method && requestQueue[method]) {
      if (error) {
        requestQueue[method].reject({
          code: error.code,
          message: error.message,
          data: error.data,
        });
      } else {
        // Handle account-related methods with new format
        if (method === 'eth_requestAccounts') {
          const { accounts, organizationId } = result[0];
          updateStore({ accounts, organizationId });

          // Return only the accounts array to maintain EIP1193 compatibility
          requestQueue[method].resolve(accounts);
        } else {
          requestQueue[method].resolve(result);
        }
      }
      delete requestQueue[method];
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }

  // Define a set of methods that should use public RPC
  const PUBLIC_RPC_METHODS = new Set([
    'eth_sendRawTransaction',
    'eth_chainId',
    'eth_subscribe',
    'eth_unsubscribe',
    'eth_blobBaseFee',
    'eth_blockNumber',
    'eth_call',
    'eth_coinbase',
    'eth_estimateGas',
    'eth_feeHistory',
    'eth_gasPrice',
    'eth_getBalance',
    'eth_getBlockByHash',
    'eth_getBlockByNumber',
    'eth_getBlockReceipts',
    'eth_getBlockTransactionCountByHash',
    'eth_getBlockTransactionCountByNumber',
    'eth_getCode',
    'eth_getFilterChanges',
    'eth_getFilterLogs',
    'eth_getLogs',
    'eth_getProof',
    'eth_getStorageAt',
    'eth_getTransactionByBlockHashAndIndex',
    'eth_getTransactionByBlockNumberAndIndex',
    'eth_getTransactionByHash',
    'eth_getTransactionCount',
    'eth_getTransactionReceipt',
    'eth_getUncleCountByBlockHash',
    'eth_getUncleCountByBlockNumber',
    'eth_maxPriorityFeePerGas',
    'eth_newBlockFilter',
    'eth_newFilter',
    'eth_newPendingTransactionFilter',
    'eth_syncing',
    'eth_uninstallFilter',
  ]);

  const request: EIP1193RequestFn<EIP1474Methods> = async function (
    this: any,
    { method, params }
  ) {
    if (typeof window === 'undefined') {
      throw new Error('Window is not defined');
    }
    const client = await getTurnkeyClient();
    if (!client) {
      throw new Error('Iframe client is not defined');
    }

    if (method === 'eth_chainId') {
      return holesky.id;
    }

    // Route public RPC methods through RPC endpoint
    if (PUBLIC_RPC_METHODS.has(method)) {
      // Hardcoded for now, this should be configurable
      const rpcUrl = holesky.rpcUrls.default.http[0];

      if (!rpcUrl) {
        throw new Error('No RPC URL available for current chain');
      }

      const rpcClient = getHttpRpcClient(rpcUrl);
      const response = await rpcClient.request({
        body: {
          method,
          params,
          id: Math.floor(Math.random() * 1000000),
        },
      });
      if ((response as any).error) {
        throw new RpcRequestError({
          body: { method, params },
          error: (response as any).error,
          url: rpcUrl,
        });
      }

      return (response as any).result;
    }

    switch (method) {
      case 'eth_accounts':

      case 'eth_requestAccounts':
        const { wallets } = await client.getWallets({
          organizationId: session.organizationId,
        });

        const accounts = await Promise.all(
          wallets.map(async ({ walletId }: { walletId: string }) => {
            const { accounts } = await client.getWalletAccounts({
              walletId,
              organizationId: session.organizationId,
            });

            return accounts
              .filter(
                ({ addressFormat }) =>
                  addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
              )
              .map(({ address }) => getAddress(address));
          })
        );
        updateAccounts(accounts.flat());
        console.log('accounts', accounts);
        return [accounts.flat()[0]];
      case 'personal_sign':
      case 'eth_sign':
        const [message, signWith] = params as WalletRpcSchema[6]['Parameters'];

        const { r, s, v } = await client.signRawPayload({
          signWith: getAddress(signWith),
          payload: pad(message),
          encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
          hashFunction: 'HASH_FUNCTION_NO_OP',
        });

        const signature = serializeSignature({
          r: `0x${r}`,
          s: `0x${s}`,
          yParity: 1,
        });

        return signature;
      case 'eth_sendTransaction':
        const [transaction] = params as WalletRpcSchema[7]['Parameters'];
        const signedTransaction = this.request({
          method: 'eth_signTransaction',
          params: [transaction],
        }) as WalletRpcSchema[7]['ReturnType'];
        return signedTransaction;
      default:
        return null;
    }

    // Handle eth_sendTransaction specially as it needs to be signed first
    // if (method === 'eth_sendTransaction') {
    //   const [transaction] = params as WalletRpcSchema[7]['Parameters'];
    //   const signedTransaction = this.request({
    //     method: 'eth_signTransaction',
    //     params: [transaction],
    //   }) as WalletRpcSchema[7]['ReturnType'];

    //   // Route the signed transaction through public RPC
    //   return this.request({
    //     method: 'eth_sendRawTransaction',
    //     params: [signedTransaction],
    //   });
    // }

    // if (method === 'eth_requestAccounts') {
    //   const store = getStore();
    //   if (store.accounts.length > 0) {
    //     return store.accounts;
    //   }
    //   const client = await iframeClient;
    //   const { wallets } = await client.getWallets({
    //     organizationId: store.organizationId,
    //   });
    //   wallets.map(({ walletId }: { walletId: string }) => {
    //     console.log('walletId', walletId);
    //   });

    //   // TODO: Grab accounts from the turnkey api
    //   // If no stored accounts, request them
    //   return this.request({ method: 'eth_requestAccounts' });
    // }

    // // Handle eth_accounts
    // if (method === 'eth_accounts') {
    //   const store = getStore();
    //   if (store.accounts.length > 0) {
    //     return store.accounts;
    //   }
    //   // If no stored accounts, request them
    //   return this.request({ method: 'eth_requestAccounts' });
    // }

    return this.send(method, params);
  };

  return {
    request,
    on: eventEmitter.on.bind(eventEmitter),
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
  };
}
