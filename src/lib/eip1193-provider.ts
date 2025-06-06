import {
  EIP1193Provider,
  EIP1193RequestFn,
  EIP1474Methods,
  WalletRpcSchema,
  pad,
  getAddress,
  RpcRequestError,
  serializeSignature,
  serializeTransaction,
  hexToBigInt,
} from 'viem';

import EventEmitter from 'events';
import { getTurnkeyClient } from './turnkey';
import { base } from 'viem/chains';
import { getHttpRpcClient } from 'viem/utils';

interface ProviderStore {
  accounts: string[];
  organizationId?: string;
}

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface HttpRpcClient {
  request: (params: {
    body: { method: string; params: unknown[]; id: number };
  }) => Promise<unknown>;
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
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
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

  const request = async function (
    this: unknown,
    { method, params }: { method: string; params?: unknown }
  ): Promise<unknown> {
    console.group(`🌐 [EIP1193] ${method}`);
    console.log('Parameters:', params);

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not defined');
      }
      const client = await getTurnkeyClient();
      if (!client) {
        throw new Error('Iframe client is not defined');
      }

      if (method === 'eth_chainId') {
        console.log('Returning chain ID:', base.id);
        console.groupEnd();
        return base.id;
      }

      // Route public RPC methods through RPC endpoint
      if (PUBLIC_RPC_METHODS.has(method)) {
        console.log('Routing to public RPC endpoint');
        const rpcUrl = base.rpcUrls.default.http[0];

        if (!rpcUrl) {
          throw new Error('No RPC URL available for current chain');
        }

        console.log('RPC URL:', rpcUrl);
        const rpcClient = getHttpRpcClient(rpcUrl) as HttpRpcClient;
        const response = await rpcClient.request({
          body: {
            method,
            params: params as unknown[],
            id: Math.floor(Math.random() * 1000000),
          },
        });

        const rpcResponse = response as RpcResponse;
        if (rpcResponse.error) {
          console.error('RPC Error:', rpcResponse.error);
          console.groupEnd();
          const rpcError = new RpcRequestError({
            body: { method, params },
            error: rpcResponse.error,
            url: rpcUrl,
          });
          throw rpcError;
        }

        console.log('✅ RPC Success');
        console.log('Result:', rpcResponse.result);
        console.groupEnd();
        return rpcResponse.result;
      }

      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          console.log('Fetching Turnkey wallets...');
          const { wallets } = await client.getWallets({
            organizationId: session.organizationId,
          });
          console.log('Found wallets:', wallets.length);

          const accounts = await Promise.all(
            wallets.map(async ({ walletId }: { walletId: string }) => {
              console.log('Processing wallet:', walletId);
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

          const flatAccounts = accounts.flat();
          updateAccounts(flatAccounts);
          console.log('✅ Ethereum accounts retrieved:', flatAccounts.length);
          console.log('Primary account:', flatAccounts[0]);
          console.groupEnd();
          return [flatAccounts[0]];
        case 'personal_sign':
        case 'eth_sign':
          const [message, signWith] =
            params as WalletRpcSchema[6]['Parameters'];

          const { r, s } = await client.signRawPayload({
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
        case 'eth_signTransaction': {
          const [transaction] = params as WalletRpcSchema[7]['Parameters'];
          if (!transaction) {
            throw new Error('Transaction is required');
          }

          console.log('Transaction to sign:', transaction);

          // Serialize the prepared transaction (gas, nonce, etc. already set by usePrepareTransactionRequest)
          const serializedTx = serializeTransaction({
            to: transaction.to,
            from: transaction.from,
            chainId: base.id,
            gas: hexToBigInt(transaction.gas!),
            maxFeePerGas: hexToBigInt(transaction.maxFeePerGas!),
            maxPriorityFeePerGas: hexToBigInt(
              transaction.maxPriorityFeePerGas!
            ),
            nonce: Number(transaction.nonce),
            value: hexToBigInt(transaction.value!),
            type: 'eip1559',
          });

          const serializedTxWithoutPrefix = serializedTx.slice(2);
          console.log(
            'Serialized transaction length:',
            serializedTxWithoutPrefix.length,
            'chars'
          );

          // Sign with Turnkey
          console.log('Signing with Turnkey...');
          const { signedTransaction } = await client.signTransaction({
            signWith: getAddress(transaction.from as `0x${string}`),
            unsignedTransaction: serializedTxWithoutPrefix,
            type: 'TRANSACTION_TYPE_ETHEREUM',
            organizationId: session.organizationId,
          });

          const result = `0x${signedTransaction}`;
          console.log('✅ Transaction signed successfully');
          console.log('Signed transaction length:', result.length, 'chars');
          console.groupEnd();
          return result;
        }
        case 'eth_sendTransaction': {
          const [transaction] = params as WalletRpcSchema[7]['Parameters'];
          console.log('Sending transaction:', {
            to: transaction.to,
            value: transaction.value,
            from: transaction.from,
          });

          console.log('Step 1: Signing transaction...');
          const signedTransaction = (await request.call(this, {
            method: 'eth_signTransaction',
            params: [transaction],
          })) as string;
          console.log('Step 2: Broadcasting to network...');
          const txHash = (await request.call(this, {
            method: 'eth_sendRawTransaction',
            params: [signedTransaction],
          })) as string;
          console.log('✅ Transaction broadcast successful');
          console.log('Transaction hash:', txHash);
          console.groupEnd();

          return txHash;
        }
        default:
          return null;
      }
    } catch (error) {
      console.group('❌ [EIP1193] Error');
      console.error('Method:', method);
      console.error(
        'Error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      console.groupEnd();
      throw error;
    }
  };

  return {
    request: request as EIP1193RequestFn<EIP1474Methods>,
    on: eventEmitter.on.bind(eventEmitter),
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
  };
}
