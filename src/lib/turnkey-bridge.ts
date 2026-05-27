import type { TurnkeySDKClientBase, Wallet } from '@turnkey/react-wallet-kit';

type Session = { organizationId: string; userId?: string; token?: string };

interface LoginResolver {
  resolve: (accounts: string[]) => void;
  reject: (err: unknown) => void;
}

interface TurnkeyBridge {
  handleLogin: (() => Promise<void>) | null;
  httpClient: TurnkeySDKClientBase | null;
  session: Session | null;
  wallets: Wallet[];
  _loginResolvers: LoginResolver[];

  getEthAddresses(): string[];
  getSolanaAddress(): string | null;
  notifyAccountsReady(): void;
  notifyLoginFailed(err: unknown): void;
  requestLogin(): Promise<string[]>;
  waitForAccounts(timeoutMs?: number): Promise<string[]>;
}

export const turnkeyBridge: TurnkeyBridge = {
  handleLogin: null,
  httpClient: null,
  session: null,
  wallets: [],
  _loginResolvers: [],

  getEthAddresses() {
    return this.wallets
      .flatMap((w) => w.accounts)
      .filter(
        (a) =>
          a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM' &&
          a.address.startsWith('0x')
      )
      .map((a) => a.address);
  },

  getSolanaAddress() {
    return (
      this.wallets
        .flatMap((w) => w.accounts)
        .find((a) => a.addressFormat === 'ADDRESS_FORMAT_SOLANA')?.address ??
      null
    );
  },

  notifyAccountsReady() {
    const addrs = this.getEthAddresses();
    const resolvers = this._loginResolvers.splice(0);
    resolvers.forEach(({ resolve }) => resolve(addrs));
  },

  notifyLoginFailed(err: unknown) {
    const resolvers = this._loginResolvers.splice(0);
    resolvers.forEach(({ reject }) => reject(err));
  },

  waitForAccounts(timeoutMs = 300_000) {
    return new Promise<string[]>((resolve, reject) => {
      if (this.session && this.wallets.length > 0) {
        const addrs = this.getEthAddresses();
        if (addrs.length > 0) {
          resolve(addrs);
          return;
        }
      }

      // resolver is filled in after timer so both can be const
      const resolver = {} as LoginResolver;
      const timer = setTimeout(() => {
        const idx = this._loginResolvers.indexOf(resolver);
        if (idx !== -1) this._loginResolvers.splice(idx, 1);
        reject(new Error('Login timeout'));
      }, timeoutMs);

      Object.assign(resolver, {
        resolve: (accounts: string[]) => { clearTimeout(timer); resolve(accounts); },
        reject: (err: unknown) => { clearTimeout(timer); reject(err); },
      });

      this._loginResolvers.push(resolver);
    });
  },

  async requestLogin() {
    if (!this.handleLogin) throw new Error('TurnkeyBridge not initialized');
    if (this.session && this.wallets.length > 0) {
      const addrs = this.getEthAddresses();
      if (addrs.length > 0) return addrs;
    }
    this.handleLogin().catch((err) => this.notifyLoginFailed(err));
    return this.waitForAccounts();
  },
};
