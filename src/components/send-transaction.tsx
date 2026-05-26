'use client';

import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { sepolia } from 'wagmi/chains';

export function SendTransaction() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('0.001');
  const [turnkeyTxHash, setTurnkeyTxHash] = useState<string | null>(null);
  const [isTurnkeySending, setIsTurnkeySending] = useState(false);

  const { address, connector } = useAccount();
  const isTurnkey = connector?.id === 'turnkeyWallet';

  const { ethSendTransaction, pollTransactionStatus } = useTurnkey();
  const { sendTransaction, data: wagmiHash, isPending: wagmiPending, error: wagmiError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: wagmiHash });

  const isValidAddress = to === '' || isAddress(to);
  const isValidAmount = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
  const isSending = isTurnkeySending || wagmiPending || isConfirming;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !amount || !isAddress(to) || !address) return;

    if (isTurnkey) {
      setIsTurnkeySending(true);
      setTurnkeyTxHash(null);
      try {
        const statusId = await ethSendTransaction({
          transaction: {
            from: address,
            to,
            value: parseEther(amount).toString(),
            caip2: 'eip155:11155111',
          },
        });

        const result = await pollTransactionStatus({ sendTransactionStatusId: statusId });
        const txHash = result.eth?.txHash ?? result.txStatus;
        setTurnkeyTxHash(txHash);
        toast.success(
          <div className="flex flex-col gap-1">
            <div>Transaction confirmed!</div>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              View on Etherscan
            </a>
          </div>
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        toast.error(msg);
      } finally {
        setIsTurnkeySending(false);
      }
    } else {
      sendTransaction({ to: to as `0x${string}`, value: parseEther(amount), chainId: sepolia.id });
    }
  };

  const txHash = isTurnkey ? turnkeyTxHash : wagmiHash;
  const canSubmit = isValidAddress && isValidAmount && to !== '' && !isSending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Send Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient Address</Label>
            <Input
              id="to"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={!isValidAddress ? 'border-red-500' : ''}
            />
            {!isValidAddress && <div className="text-red-500 text-sm">Invalid Ethereum address</div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={!isValidAmount && amount !== '' ? 'border-red-500' : ''}
            />
            {!isValidAmount && amount !== '' && <div className="text-red-500 text-sm">Invalid amount</div>}
          </div>

          {wagmiError && <div className="text-red-500 text-sm break-words">{wagmiError.message}</div>}

          {txHash && (
            <Card className="bg-muted">
              <CardContent className="p-3 space-y-1">
                <div className="text-sm font-medium">Transaction Hash</div>
                <div className="text-muted-foreground text-xs break-all font-mono">{txHash}</div>
                {!isTurnkey && isConfirming && <div className="text-blue-600 text-sm">Waiting for confirmation...</div>}
                {!isTurnkey && isConfirmed && <div className="text-green-600 text-sm">Confirmed!</div>}
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isSending ? 'Sending...' : 'Send Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
