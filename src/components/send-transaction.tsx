'use client';

import { useEffect, useState } from 'react';
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  usePrepareTransactionRequest,
} from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function SendTransaction() {
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('0.001');

  // Prepare transaction with gas estimation and nonce
  const { data: preparedRequest } = usePrepareTransactionRequest({
    to: to && isAddress(to) ? (to as `0x${string}`) : undefined,
    value: amount ? parseEther(amount) : undefined,
  });

  const {
    sendTransaction,
    data: hash,
    isPending,
    error,
  } = useSendTransaction();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Monitor transaction state changes
  useEffect(() => {
    console.group('🔄 [ETH-TX] State Update');
    console.log('Hash:', hash || 'none');
    console.log('Status:', {
      isPending,
      isConfirming,
      isConfirmed,
      hasError: !!error,
    });
    if (error) console.log('Error:', error.message);
    if (receipt)
      console.log('Receipt:', {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      });
    console.groupEnd();
  }, [hash, isPending, isConfirming, isConfirmed, error, receipt]);

  // Show loading toast when transaction is sent
  useEffect(() => {
    if (hash) {
      console.log(
        '🎯 [ETH-TX] Displaying loading toast for transaction:',
        hash
      );
      toast.loading(
        <div className="flex flex-col gap-1">
          <div>Transaction sent!</div>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            View on Basescan: {hash.slice(0, 10)}...
          </a>
        </div>,
        {
          id: hash,
          duration: Infinity,
          dismissible: true,
        }
      );
    }
  }, [hash]);

  // Show success toast when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('✅ [ETH-TX] Transaction confirmed, updating toast:', hash);
      toast.success(
        <div className="flex flex-col gap-1">
          <div>Transaction confirmed!</div>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            View on Basescan: {hash.slice(0, 10)}...
          </a>
        </div>,
        {
          id: hash,
          dismissible: true,
        }
      );
    }
  }, [isConfirmed, hash]);

  // Show error toast for transaction failures
  useEffect(() => {
    if (error) {
      console.error('❌ [ETH-TX] Transaction failed:', error.message);
      toast.error(`Transaction failed: ${error.message}`, {
        dismissible: true,
      });
    }
  }, [error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.group('📝 [ETH-TX] Form Submission');
    console.log('Recipient:', to);
    console.log('Amount:', `${amount} ETH`);

    // Validate required fields
    if (!to || !amount) {
      console.warn('Validation failed: Missing required fields');
      console.groupEnd();
      return;
    }

    // Validate address format
    if (!isAddress(to)) {
      console.warn('Validation failed: Invalid Ethereum address format');
      console.groupEnd();
      toast.error('Invalid Ethereum address', { dismissible: true });
      return;
    }

    // Check if we have a prepared request
    if (!preparedRequest) {
      console.warn('Validation failed: Transaction not prepared');
      console.groupEnd();
      toast.error('Transaction preparation failed', { dismissible: true });
      return;
    }

    console.log('Prepared transaction:', { preparedRequest });

    // Send the prepared transaction
    sendTransaction(preparedRequest);

    console.log('✅ Transaction initiated via Wagmi with prepared request');
    console.groupEnd();
  };

  const isValidAddress = to === '' || isAddress(to);
  const isValidAmount =
    amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
  const canSubmit =
    isValidAddress &&
    isValidAmount &&
    to !== '' &&
    !isPending &&
    !isConfirming &&
    preparedRequest;

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
              <div className="text-red-500 text-sm">
                Invalid Ethereum address
              </div>
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
              className={
                !isValidAmount && amount !== '' ? 'border-red-500' : ''
              }
            />
            {!isValidAmount && amount !== '' && (
              <div className="text-red-500 text-sm">Invalid amount</div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm break-words">
              {error.message}
            </div>
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
                    <div className="text-blue-600 text-sm">
                      Waiting for confirmation...
                    </div>
                  )}
                  {isConfirmed && (
                    <div className="text-green-600 text-sm">
                      Transaction confirmed!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {receipt && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-muted-foreground text-sm break-all shadow-inner bg-transparent rounded-sm font-mono">
                  {JSON.stringify(
                    {
                      blockNumber: receipt.blockNumber.toString(),
                      gasUsed: receipt.gasUsed.toString(),
                      status: receipt.status,
                    },
                    null,
                    2
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isPending
              ? 'Sending...'
              : isConfirming
              ? 'Confirming...'
              : !preparedRequest && to && amount
              ? 'Preparing...'
              : 'Send Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
