'use client';

import { useEffect, useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function SendTransaction() {
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('0.001');

  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  
  const { 
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !amount) return;
    
    if (!isAddress(to)) {
      return;
    }

    try {
      const value = parseEther(amount);
      console.log('Sending transaction to:', to);
      console.log('Sending transaction amount:', amount);
      sendTransaction({
        to: to as `0x${string}`,
        value,
        onSuccess: ({ hash }) => {
          console.log('Transaction sent:', hash);
        },
        onError: (error) => {
          console.error('Transaction failed:', error);
        },
      });
    } catch (err) {
      console.error('Failed to parse amount:', err);
    }
  };

  const isValidAddress = to === '' || isAddress(to);
  const isValidAmount = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
  const canSubmit = isValidAddress && isValidAmount && to !== '' && !isPending && !isConfirming;

  return (
    <Card className="w-full max-w-md">
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
            {!isValidAddress && (
              <div className="text-red-500 text-sm">Invalid Ethereum address</div>
            )}
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
            {!isValidAmount && amount !== '' && (
              <div className="text-red-500 text-sm">Invalid amount</div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm break-words">{error.message}</div>
          )}

          {hash && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Transaction Hash:</div>
                  <div className="text-muted-foreground text-sm break-all font-mono">
                    {hash}
                  </div>
                  {isConfirming && (
                    <div className="text-blue-600 text-sm">Waiting for confirmation...</div>
                  )}
                  {isConfirmed && (
                    <div className="text-green-600 text-sm">Transaction confirmed!</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {receipt && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-muted-foreground text-sm break-all shadow-inner bg-transparent rounded-sm font-mono">
                  {JSON.stringify({
                    blockNumber: receipt.blockNumber.toString(),
                    gasUsed: receipt.gasUsed.toString(),
                    status: receipt.status
                  }, null, 2)}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!canSubmit}>
            {isPending ? 'Sending...' : 
             isConfirming ? 'Confirming...' : 
             'Send Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}