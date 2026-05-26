import {
  type EIP1193Provider,
  type EIP1193RequestFn,
  type EIP1474Methods,
  type WalletRpcSchema,
  pad,
  getAddress,
  RpcRequestError,
  serializeSignature,
  serializeTransaction,
  hexToBigInt,
} from 'viem';
import { sepolia } from 'viem/chains';
import { getHttpRpcClient } from 'viem/utils';
import EventEmitter from 'events';
import { turnkeyBridge } from './turnkey-bridge';

interface ProviderStore {
  accounts: string[];
  organizationId?: string;
}

export const STORAGE_KEY = 'TK:EIP1193Provider:store';

export function clearProviderStore() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const getStore = (): ProviderStore => {
  if (typeof localStorage === 'undefined') return { accounts: [] };
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : { accounts: [] };
};

const updateStore = (
  updates: Partial<ProviderStore>,
  emitter: EventEmitter
) => {
  const current = getStore();
  const next = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  if (
    updates.accounts &&
    JSON.stringify(updates.accounts) !== JSON.stringify(current.accounts)
  ) {
    emitter.emit('accountsChanged', updates.accounts);
  }
};

// Public JSON-RPC methods routed directly to Sepolia RPC
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

export function createEIP1193Provider(): EIP1193Provider {
  const eventEmitter = new EventEmitter();

  const rpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    'https://ethereum-sepolia-rpc.publicnode.com';

  const request: EIP1193RequestFn<EIP1474Methods> = async ({
    method,
    params,
  }) => {
    if (typeof window === 'undefined') throw new Error('Window is not defined');

    if (method === 'eth_accounts') {
      const stored = getStore().accounts;
      if (stored.length > 0) return stored;
      // On wagmi reconnect the store is empty; bridge may already hold a session restored from localStorage.
      const bridgeAddrs = turnkeyBridge.getEthAddresses().map(getAddress);
      if (bridgeAddrs.length > 0) {
        updateStore(
          { accounts: bridgeAddrs, organizationId: turnkeyBridge.session?.organizationId },
          eventEmitter
        );
      }
      return bridgeAddrs;
    }

    if (method === 'eth_requestAccounts') {
      const accounts = await turnkeyBridge.requestLogin();
      const checksummed = accounts.map(getAddress);
      updateStore(
        {
          accounts: checksummed,
          organizationId: turnkeyBridge.session?.organizationId,
        },
        eventEmitter
      );
      return checksummed;
    }

    if (method === 'eth_sendTransaction') {
      // sign then broadcast — avoid recursive typed call by casting through unknown
      const signReq = { method: 'eth_signTransaction' as const, params: params as WalletRpcSchema[7]['Parameters'] };
      const signed = (await (request as unknown as (a: typeof signReq) => Promise<`0x${string}`>)(signReq));
      const broadcastReq = { method: 'eth_sendRawTransaction' as const, params: [signed] as [`0x${string}`] };
      return (request as unknown as (a: typeof broadcastReq) => Promise<`0x${string}`>)(broadcastReq);
    }

    if (PUBLIC_RPC_METHODS.has(method)) {
      const rpcClient = getHttpRpcClient(rpcUrl);
      const response = await rpcClient.request({
        body: { method, params: (params ?? []) as unknown[], id: Math.floor(Math.random() * 1_000_000) },
      });
      if (response.error) {
        throw new RpcRequestError({ body: { method, params }, error: response.error, url: rpcUrl });
      }
      return response.result;
    }

    const client = turnkeyBridge.httpClient;
    if (!client) throw new Error('Turnkey client not initialized');

    switch (method) {
      case 'personal_sign': {
        const [message, signWith] = params as WalletRpcSchema[6]['Parameters'];
        const { r, s, v } = await client.signRawPayload({
          signWith: getAddress(signWith),
          payload: pad(message),
          encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
          hashFunction: 'HASH_FUNCTION_NO_OP',
          organizationId: getStore().organizationId,
        });
        // Turnkey returns v as "00"/"01" (raw recovery bit); viem expects yParity (0|1) or v (27|28)
        return serializeSignature({ r: `0x${r}`, s: `0x${s}`, yParity: parseInt(v, 16) as 0 | 1 });
      }

      case 'eth_sign': {
        // eth_sign params are [address, message] — reversed from personal_sign
        const [signWith, message] = params as [`0x${string}`, `0x${string}`];
        const { r, s, v } = await client.signRawPayload({
          signWith: getAddress(signWith),
          payload: pad(message),
          encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
          hashFunction: 'HASH_FUNCTION_NO_OP',
          organizationId: getStore().organizationId,
        });
        return serializeSignature({ r: `0x${r}`, s: `0x${s}`, yParity: parseInt(v, 16) as 0 | 1 });
      }

      case 'eth_signTransaction': {
        const [transaction] = params as WalletRpcSchema[7]['Parameters'];
        if (!transaction) throw new Error('Transaction is required');

        const serializedTx = serializeTransaction({
          to: transaction.to,
          from: transaction.from,
          chainId: sepolia.id,
          gas: hexToBigInt(transaction.gas!),
          maxFeePerGas: hexToBigInt(transaction.maxFeePerGas!),
          maxPriorityFeePerGas: hexToBigInt(transaction.maxPriorityFeePerGas!),
          nonce: Number(transaction.nonce),
          value: transaction.value ? hexToBigInt(transaction.value) : 0n,
          data: transaction.data,
          type: 'eip1559',
        });

        const { signedTransaction } = await client.signTransaction({
          signWith: getAddress(transaction.from as `0x${string}`),
          unsignedTransaction: serializedTx.slice(2),
          type: 'TRANSACTION_TYPE_ETHEREUM',
          organizationId: getStore().organizationId,
        });

        return `0x${signedTransaction}`;
      }

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  };

  return {
    request,
    on: eventEmitter.on.bind(eventEmitter),
    removeListener: eventEmitter.removeListener.bind(eventEmitter),
  };
}
