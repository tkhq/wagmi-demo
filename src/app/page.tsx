'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useConnect, useConnectors, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { type WalletName } from '@solana/wallet-adapter-base';
import { useTurnkey, WalletSource, type Wallet } from '@turnkey/react-wallet-kit';
import { turnkeyBridge } from '@/lib/turnkey-bridge';
import { WalletPicker } from '@/components/wallet-picker';
import { EthereumAccount } from '@/components/account.ethereum';
import { SolanaAccount } from '@/components/account.solana';
import { SignMessage } from '@/components/sign-message';
import { SignMessageSolana } from '@/components/sign-message.solana';
import { SendTransaction } from '@/components/send-transaction';
import { SendTransactionSolana } from '@/components/send-transaction.solana';

const btnBase = 'h-10 px-4 text-sm font-semibold rounded-xl transition-opacity hover:opacity-90 text-white';

export default function Home() {
  const { isConnected, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const {
    connected: solConnected,
    select,
    connect: solConnect,
    wallet: selectedSolWallet,
    disconnect: solDisconnect,
    publicKey,
  } = useWallet();
  const { session, logout, wallets } = useTurnkey();

  const solAddress = useMemo<string | undefined>(() => {
    const embedded = ((wallets ?? []) as Wallet[]).filter(w => w.source === WalletSource.Embedded);
    for (const w of embedded) {
      const account = w.accounts?.find(a => a.addressFormat === 'ADDRESS_FORMAT_SOLANA');
      if (account?.address) return account.address;
    }
    return undefined;
  }, [wallets]);

  const [pendingTurnkeyConnect, setPendingTurnkeyConnect] = useState(false);
  const [pendingSolConnect, setPendingSolConnect] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { address } = useAccount();
  const isTurnkeyConnected = isConnected && connector?.id === 'turnkeyWallet';

  const handleTurnkeyLogin = () => {
    if (session) {
      const tkConnector = connectors.find((c) => c.id === 'turnkeyWallet');
      if (tkConnector) connect({ connector: tkConnector });
    } else {
      setPendingTurnkeyConnect(true);
      turnkeyBridge.handleLogin?.();
    }
  };

  // After selecting a Solana wallet from the picker, also flag it for explicit connect
  const handleSolanaSelect = (walletName: WalletName) => {
    select(walletName);
    setPendingSolConnect(walletName);
  };

  // After Turnkey auth completes, connect wagmi
  useEffect(() => {
    if (!pendingTurnkeyConnect || !session || isConnected) return;
    const tkConnector = connectors.find((c) => c.id === 'turnkeyWallet');
    if (tkConnector) {
      connect({ connector: tkConnector });
      setPendingTurnkeyConnect(false);
    }
  }, [pendingTurnkeyConnect, session, isConnected, connect, connectors]);

  // When an external Solana wallet is selected from the picker, wait for adapter state
  // to flush (select() is async), then explicitly connect on the next render.
  useEffect(() => {
    if (!pendingSolConnect || solConnected) return;
    if (selectedSolWallet?.adapter.name !== pendingSolConnect) return;
    setPendingSolConnect(null);
    solConnect().catch(console.error);
  }, [pendingSolConnect, solConnected, selectedSolWallet?.adapter.name, solConnect]);

  const handleLogout = async () => {
    solDisconnect();
    wagmiDisconnect();
    await logout();
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">wagmi + Solana Wallet Demo</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Turnkey embedded wallet alongside external wallets on Ethereum and Solana
            </p>
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">
                org: {session.organizationId}
              </span>
              <button onClick={handleLogout} className={`${btnBase} bg-foreground`}>
                Log out
              </button>
            </div>
          )}
        </div>

        <WalletPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onTurnkeySelect={handleTurnkeyLogin}
          onSolanaSelect={handleSolanaSelect}
        />

        {!isConnected && !solConnected ? (
          <div className="flex flex-col items-center justify-center py-24">
            <button onClick={() => setPickerOpen(true)} className={`${btnBase} bg-foreground px-8`}>
              Connect Wallet
            </button>
          </div>
        ) : isTurnkeyConnected ? (
          /* Turnkey: one unified wallet card with ETH + SOL as sub-sections */
          <div className="rounded-xl border border-border p-6 space-y-6">
            <h2 className="text-base font-semibold">Turnkey Wallet</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Ethereum</p>
                <p className="text-xs text-muted-foreground">Sepolia testnet</p>
              </div>
              <EthereumAccount />
              <SignMessage />
              <SendTransaction />
            </div>

            <div className="border-t border-border" />

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Solana</p>
                <p className="text-xs text-muted-foreground">Devnet</p>
              </div>
              {solAddress ? (
                <>
                  <SolanaAccount address={solAddress} />
                  <SignMessageSolana address={solAddress} />
                  <SendTransactionSolana address={solAddress} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading accounts…</p>
              )}
            </div>
          </div>
        ) : (
          /* External wallets: separate ETH and SOL cards */
          <div className="space-y-6">
            {isConnected && (
              <div className="rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Ethereum</h2>
                    <p className="text-xs text-muted-foreground">Sepolia testnet</p>
                  </div>
                  <button onClick={() => wagmiDisconnect()} className={`${btnBase} bg-[#3898FF] group`}>
                    <span className="group-hover:hidden">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connected'}</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                </div>
                <EthereumAccount />
                <SignMessage />
                <SendTransaction />
              </div>
            )}

            {solConnected && (
              <div className="rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Solana</h2>
                    <p className="text-xs text-muted-foreground">Devnet</p>
                  </div>
                  <button onClick={() => solDisconnect()} className={`${btnBase} bg-[#9945FF] group`}>
                    <span className="group-hover:hidden">
                      {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'Connected'}
                    </span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                </div>
                <SolanaAccount />
                <SignMessageSolana />
                <SendTransactionSolana />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
