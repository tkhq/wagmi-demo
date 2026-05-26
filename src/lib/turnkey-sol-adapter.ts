import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { TurnkeySigner } from '@turnkey/solana';
import { turnkeyBridge } from './turnkey-bridge';

export class TurnkeySolWalletAdapter extends BaseMessageSignerWalletAdapter<string> {
  readonly name = 'Turnkey' as WalletName<'Turnkey'>;
  readonly url = 'https://turnkey.com';
  readonly icon = '/turnkey-icon.svg';
  readonly readyState = WalletReadyState.Installed;
  readonly supportedTransactionVersions = null;

  private _publicKey: PublicKey | null = null;
  private _signer: TurnkeySigner | null = null;
  private _connecting = false;

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting() {
    return this._connecting;
  }

  async connect(): Promise<void> {
    if (this._connecting || (this as BaseMessageSignerWalletAdapter).connected) return;

    this._connecting = true;
    try {
      // Reuse an active session if available, otherwise trigger login
      if (!turnkeyBridge.session || turnkeyBridge.wallets.length === 0) {
        await turnkeyBridge.requestLogin();
      }

      const solAddress = turnkeyBridge.getSolanaAddress();
      if (!solAddress) throw new Error('No Solana address found on Turnkey account');

      const client = turnkeyBridge.httpClient;
      if (!client) throw new Error('Turnkey client not initialized');

      this._publicKey = new PublicKey(solAddress);
      this._signer = new TurnkeySigner({
        organizationId: turnkeyBridge.session!.organizationId,
        client,
      });

      this.emit('connect', this._publicKey);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.emit('error', error as any);
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

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (!this._signer || !this._publicKey) throw new Error('Wallet not connected');
    return (await this._signer.signTransaction(tx, this._publicKey.toBase58())) as T;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    if (!this._signer || !this._publicKey) throw new Error('Wallet not connected');
    return (await this._signer.signAllTransactions(txs, this._publicKey.toBase58())) as T[];
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._signer || !this._publicKey) throw new Error('Wallet not connected');
    return this._signer.signMessage(message, this._publicKey.toBase58());
  }
}

export const createTurnkeySolWalletAdapter = () => new TurnkeySolWalletAdapter();
