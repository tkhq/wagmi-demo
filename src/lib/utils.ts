import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  RpcTransactionRequest,
  TransactionSerializable,
  serializeTransaction,
  AddEthereumChainParameter,
  Address,
  Chain,
  EIP1193Provider,
  EIP1193RequestFn,
  EIP1474Methods,
  Hash,
  TypedDataDefinition,
} from 'viem';

import type { UUID } from 'crypto';

export type TurnkeyEIP1193ProviderOptions = {
  walletId: UUID;
  organizationId: UUID;
  chains: AddEthereumChainParameter[];
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const preprocessTransaction = ({
  from,
  ...transaction
}: RpcTransactionRequest) => {
  // Helper function to handle undefined values and conversion
  const convertValue = <T>(
    value: string | number | undefined,
    converter: (value: string | number) => T,
    defaultValue: T
  ): T => (value !== undefined ? converter(value) : defaultValue);

  const typeMapping: { [key: string]: string } = {
    '0x0': '',
    '0x1': 'eip2930',
    '0x2': 'eip1559',
  };
  const processedTransaction: TransactionSerializable = {
    ...transaction,
    // @ts-ignore
    chainId: parseInt(transaction.chainId, 16),
    type: typeMapping[transaction.type ?? ''] ?? 'eip1559',
    maxPriorityFeePerGas: convertValue(
      transaction.maxPriorityFeePerGas,
      BigInt,
      0n
    ),
    maxFeePerGas: convertValue(transaction.maxFeePerGas, BigInt, 0n),
    gasPrice: convertValue(transaction.gasPrice, BigInt, 0n),
    value: convertValue(transaction.value, BigInt, 0n),
    nonce: convertValue(
      transaction.nonce,
      (value) => parseInt(value.toString(), 16),
      0
    ),

    gas: convertValue(transaction.gas, BigInt, 0n),
  };
  const serializedTransaction = serializeTransaction(processedTransaction);

  return serializedTransaction.replace(/^0x/, '');
};

export type TurnkeyEIP1193Provider = Omit<EIP1193Provider, 'request'> & {
  request: EIP1193RequestFn<
    [
      ...EIP1474Methods,
      {
        Method: 'eth_signTypedData_v4';
        Parameters: [address: Address, typedData: TypedDataDefinition];
        ReturnType: Promise<Hash>;
      }
    ]
  >;
};

export type ProviderChain = Omit<Chain, 'nativeCurrency'> & {
  nativeCurrency?: Chain['nativeCurrency'] | undefined;
};

export type HTTPSUrl = `https://${string}`;

export type WalletAddEthereumChain = Omit<
  AddEthereumChainParameter,
  'rpcUrls' | 'blockExplorerUrls'
> & {
  rpcUrls: [string, ...string[]];
  blockExplorerUrls: [HTTPSUrl, ...HTTPSUrl[]] | null;
};

export interface ConnectInfo {
  chainId: string;
}
