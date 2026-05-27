'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  address?: string;
}

export function SendTransactionSolana({ address: addressProp }: Props) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const { publicKey, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const { solSendTransaction, pollTransactionStatus } = useTurnkey();

  const isTurnkey = !!addressProp || wallet?.adapter.name === 'Turnkey';
  const sourcePubkey = addressProp ? new PublicKey(addressProp) : publicKey;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sourcePubkey || !to || !amount) return;

      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(to);
      } catch {
        toast.error('Invalid Solana address');
        return;
      }

      const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
      if (isNaN(lamports) || lamports <= 0) {
        toast.error('Invalid amount');
        return;
      }

      setIsLoading(true);
      setTxSignature(null);

      try {
        if (isTurnkey) {
          // Use Turnkey tx management for embedded wallet
          const { blockhash } = await connection.getLatestBlockhash();
          const message = new TransactionMessage({
            payerKey: sourcePubkey,
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({ fromPubkey: sourcePubkey, toPubkey: recipientPubkey, lamports }),
            ],
          }).compileToV0Message();

          const bytes = new VersionedTransaction(message).serialize();
          const unsignedTransaction = Array.from(bytes, (b: number) =>
            b.toString(16).padStart(2, '0')
          ).join('');

          const statusId = await solSendTransaction({
            transaction: {
              unsignedTransaction,
              signWith: sourcePubkey.toBase58(),
              caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', // devnet
              recentBlockhash: blockhash,
            },
          });

          const result = await pollTransactionStatus({ sendTransactionStatusId: statusId });
          const sig = result.solana?.signature ?? result.txStatus;
          setTxSignature(sig);
          toast.success(
            <div className="flex flex-col gap-1">
              <div>Transaction confirmed!</div>
              <a
                href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                View on Solscan
              </a>
            </div>
          );
        } else {
          // External wallet (Phantom etc.) via wallet adapter
          const latestBlockhash = await connection.getLatestBlockhash();
          const message = new TransactionMessage({
            payerKey: sourcePubkey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [
              SystemProgram.transfer({ fromPubkey: sourcePubkey, toPubkey: recipientPubkey, lamports }),
            ],
          }).compileToV0Message();

          const tx = new VersionedTransaction(message);
          const signature = await sendTransaction(tx, connection);
          setTxSignature(signature);

          toast.loading(
            <div className="flex flex-col gap-1">
              <div>Transaction sent!</div>
              <a
                href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                View on Solscan
              </a>
            </div>,
            { id: signature, duration: Infinity, dismissible: true }
          );

          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          });
          if (confirmation.value.err) {
            toast.error('Transaction failed', { id: signature });
          } else {
            toast.success('Transaction confirmed!', { id: signature });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [sourcePubkey, connection, to, amount, isTurnkey, solSendTransaction, pollTransactionStatus, sendTransaction]
  );

  const isValidAddress = to === '' || (() => { try { new PublicKey(to); return true; } catch { return false; } })();
  const isValidAmount = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
  const canSubmit = isValidAddress && isValidAmount && to !== '' && !isLoading && !!sourcePubkey;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send Solana Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to-sol">Recipient Address</Label>
            <Input
              id="to-sol"
              placeholder="Public key..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={!isValidAddress ? 'border-red-500' : ''}
            />
            {!isValidAddress && <div className="text-red-500 text-sm">Invalid Solana address</div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount-sol">Amount (SOL)</Label>
            <Input
              id="amount-sol"
              type="number"
              step="0.001"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={!isValidAmount && amount !== '' ? 'border-red-500' : ''}
            />
            {!isValidAmount && amount !== '' && <div className="text-red-500 text-sm">Invalid amount</div>}
          </div>

          {txSignature && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-sm font-medium">Signature</div>
                <div className="text-muted-foreground text-xs break-all font-mono">{txSignature}</div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isLoading ? 'Sending...' : 'Send Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
