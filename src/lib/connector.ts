import { type Connector, createConnector } from 'wagmi';
import { createEIP1193Provider } from './eip1193-provider';
import {
  getAddress,
  type Address,
  type Chain,
  type EIP1193Provider,
} from 'viem';

export interface WalletOptions {
  chains?: Chain[];
}

let accountsChanged: Connector['onAccountsChanged'] | undefined;
let chainChanged: Connector['onChainChanged'] | undefined;
let disconnect: Connector['onDisconnect'] | undefined;

export function walletConnector(options: WalletOptions = {}) {
  let provider: EIP1193Provider | null = null;

  type Properties = {};
  type Provider = EIP1193Provider;

  return createConnector<Provider, Properties>((config) => ({
    id: 'wallet',
    name: 'Wallet',
    type: 'wallet' as const,

    async connect() {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this);
        provider.on('accountsChanged', accountsChanged);
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this);
        provider.on('chainChanged', chainChanged);
      }
      if (!disconnect) {
        disconnect = this.onDisconnect.bind(this);
        provider.on('disconnect', disconnect);
      }

      const chainId = await provider.request({ method: 'eth_chainId' });

      return {
        accounts: accounts as readonly `0x${string}`[],
        chainId: Number(chainId),
      };
    },

    async getProvider() {
      if (!provider) {
        provider = createEIP1193Provider();
      }
      return provider;
    },

    async disconnect() {
      if (accountsChanged) {
        provider?.removeListener('accountsChanged', accountsChanged);
      }
      if (chainChanged) {
        provider?.removeListener('chainChanged', chainChanged);
      }
      if (disconnect) {
        provider?.removeListener('disconnect', disconnect);
      }
    },

    async getAccounts(): Promise<Address[]> {
      const accounts = await provider?.request({ method: 'eth_accounts' });
      return accounts as Address[];
    },

    async getChainId() {
      const chainId = await provider?.request({ method: 'eth_chainId' });
      return Number(chainId);
    },

    async isAuthorized() {
      try {
        const account = await this.getAccounts();
        return !!account;
      } catch (_: unknown) {
        return false;
      }
    },

    onAccountsChanged(accounts: Address[]) {
      if (accounts.length === 0) this.onDisconnect();
      else
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x)),
        });
    },

    onChainChanged(chainId: string) {
      config.emitter.emit('change', { chainId: Number(chainId) });
    },

    async onDisconnect() {
      config.emitter.emit('disconnect');

      if (accountsChanged) {
        provider?.removeListener('accountsChanged', accountsChanged);
        accountsChanged = undefined;
      }
      if (chainChanged) {
        provider?.removeListener('chainChanged', chainChanged);
        chainChanged = undefined;
      }
      if (disconnect) {
        provider?.removeListener('disconnect', disconnect);
        disconnect = undefined;
      }
    },
  }));
}
