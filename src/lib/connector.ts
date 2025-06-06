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
    id: 'turnkey',
    name: 'Turnkey',
    type: 'wallet' as const,

    async connect() {
      console.group('🔌 [Connector] Connection');
      console.log('Initializing Turnkey connector...');
      
      const provider = await this.getProvider();
      console.log('Provider ready');
      
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      console.log('Accounts requested:', accounts.length);

      // Set up event listeners
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
      console.log('✅ Connection established');
      console.log('Chain ID:', chainId);
      console.log('Primary account:', accounts[0]);
      console.groupEnd();
      
      return {
        accounts: accounts as readonly `0x${string}`[],
        chainId: Number(chainId),
      };
    },

    async getProvider() {
      if (!provider) {
        console.log('🔌 [Connector] Creating EIP1193 provider...');
        provider = await createEIP1193Provider();
        console.log('✅ [Connector] Provider created');
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
      console.log('🔌 [Connector] Retrieved accounts:', accounts?.length || 0);
      return accounts as Address[];
    },

    async getChainId() {
      const chainId = await provider?.request({ method: 'eth_chainId' });
      console.log('🔌 [Connector] Retrieved chain ID:', chainId);
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
      console.log('🔌 [Connector] Accounts changed:', accounts.length);
      if (accounts.length === 0) this.onDisconnect();
      else
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x)),
        });
    },

    onChainChanged(chainId: string) {
      console.log('🔌 [Connector] Chain changed to:', chainId);
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
