'use client';

import Image from 'next/image';
import { useConnect, useConnectors } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WalletPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTurnkeySelect: () => void;
  onSolanaSelect: (walletName: WalletName) => void;
}

export function WalletPicker({ open, onOpenChange, onTurnkeySelect, onSolanaSelect }: WalletPickerProps) {
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { wallets: solWallets } = useWallet();

  const externalEthConnectors = connectors
    .filter((c) => c.id !== 'turnkeyWallet' && c.id !== 'injected')
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);

  const externalSolWallets = solWallets.filter(
    (w) =>
      w.adapter.name !== 'Turnkey' &&
      (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
  );

  const handleTurnkey = () => { onOpenChange(false); onTurnkeySelect(); };
  const handleEth = (connector: (typeof externalEthConnectors)[number]) => { onOpenChange(false); connect({ connector }); };
  const handleSolana = (walletName: WalletName) => { onOpenChange(false); onSolanaSelect(walletName); };

  const btnClass = 'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base">Connect wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 mt-1">
          <button onClick={handleTurnkey} className={btnClass}>
            <Image src="/turnkey-icon.svg" alt="Turnkey" width={32} height={32} className="rounded-md" />
            <div className="text-sm font-medium">Turnkey</div>
          </button>

          {externalEthConnectors.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground px-3 py-1 mt-1">Ethereum wallets</div>
              {externalEthConnectors.map((connector) => (
                <button key={connector.id} onClick={() => handleEth(connector)} className={btnClass}>
                  {connector.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={connector.icon} alt={connector.name} width={32} height={32} className="rounded-md" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs">
                      {connector.name[0]}
                    </div>
                  )}
                  <div className="text-sm font-medium">{connector.name}</div>
                </button>
              ))}
            </>
          )}

          {externalSolWallets.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground px-3 py-1 mt-1">Solana wallets</div>
              {externalSolWallets.map((wallet) => (
                <button key={wallet.adapter.name} onClick={() => handleSolana(wallet.adapter.name)} className={btnClass}>
                  {wallet.adapter.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.adapter.icon} alt={wallet.adapter.name} width={32} height={32} className="rounded-md" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs">
                      {wallet.adapter.name[0]}
                    </div>
                  )}
                  <div className="text-sm font-medium">{wallet.adapter.name}</div>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
