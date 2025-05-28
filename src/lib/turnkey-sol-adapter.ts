import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { TurnkeySigner } from '@turnkey/solana';

import { getTurnkeyClient } from './turnkey';

export class TurnkeySolWalletAdapter extends BaseMessageSignerWalletAdapter<string> {
  readonly name = 'Turnkey' as WalletName<'Turnkey'>;
  readonly url = 'https://turnkey.com';
  readonly icon = '/turnkey-logo.svg';
  readonly readyState = WalletReadyState.Installed; // always visible in modal
  readonly supportedTransactionVersions = null;

  private _publicKey: PublicKey | null = null;
  private _signer: TurnkeySigner | null = null;
  private _connecting = false;

  // BaseMessageSignerWalletAdapter from wallet-adapter-base already provides
  // `connected` & `connecting` getters, so we only track `_connecting` locally
  // for the async guard above.

  /* ------------------------------------------------------------------ */
  /*  Wallet-adapter required getters                                   */
  /* ------------------------------------------------------------------ */
  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting() {
    return this._connecting;
  }

  /* ------------------------------------------------------------------ */
  /*  Connection lifecycle                                              */
  /* ------------------------------------------------------------------ */
  async connect(): Promise<void> {
    if (this._connecting || (this as any).connected) return;

    this._connecting = true;
    try {
      const client = await getTurnkeyClient();

      // Restore previous Turnkey session if present.
      const session = JSON.parse(
        globalThis.localStorage?.getItem('@turnkey/session/v2') || '{}'
      );
      // await client.loginWithSession(session).catch(() => void 0);

      // Fetch the wallets the user owns and pick the first Solana address.
      const { wallets } = await client.getWallets({
        organizationId: session.organizationId,
      });
      console.log('get solana wallets', wallets);
      const accounts = await Promise.all(
        wallets.map(async ({ walletId }: { walletId: string }) => {
          const { accounts } = await client.getWalletAccounts({
            walletId,
            organizationId: session.organizationId,
          });
          console.log('accounts', accounts);
          return accounts
            .filter(
              ({ addressFormat }) => addressFormat === 'ADDRESS_FORMAT_SOLANA'
            )
            .map(({ address }) => address);
        })
      );
      console.log('accounts', accounts);

      if (!accounts.flat().length) {
        throw new Error('No Solana address found on Turnkey account');
      }

      this._publicKey = new PublicKey(accounts.flat()[0]);
      this._signer = new TurnkeySigner({
        organizationId: session.organizationId,
        // @ts-ignore
        client,
      });

      this.emit('connect', this._publicKey);
    } catch (error) {
      // @ts-ignore
      this.emit('error', error as Error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this._signer = null;
    this.emit('disconnect');
  }

  /* ------------------------------------------------------------------ */
  /*  Signing                                                            */
  /* ------------------------------------------------------------------ */
  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (!this._signer || !this._publicKey)
      throw new Error('Wallet not connected');
    // Delegates to TurnkeySigner which returns a fully-signed transaction.
    return (await this._signer.signTransaction(
      tx,
      this._publicKey.toBase58()
    )) as T;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    if (!this._signer || !this._publicKey)
      throw new Error('Wallet not connected');
    return (await this._signer.signAllTransactions(
      txs,
      this._publicKey.toBase58()
    )) as T[];
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._signer || !this._publicKey)
      throw new Error('Wallet not connected');
    return this._signer.signMessage(message, this._publicKey.toBase58());
  }
}

export const createTurnkeySolWalletAdapter = () =>
  new TurnkeySolWalletAdapter();
