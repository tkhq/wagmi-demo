'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function SendTransactionSolana() {
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState<string>('0.001');
  const [isLoading, setIsLoading] = useState(false);
  
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.group('📝 [SOL-TX] Form Submission');
    console.log('Recipient:', to);
    console.log('Amount:', `${amount} SOL`);
    
    // Check wallet connection
    if (!publicKey || !connection) {
      console.warn('Wallet not connected');
      console.groupEnd();
      toast.error('Wallet not connected', { dismissible: true });
      return;
    }
    
    // Validate required fields
    if (!to || !amount) {
      console.warn('Validation failed: Missing required fields');
      console.groupEnd();
      return;
    }
    
    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(to);
    } catch {
      console.warn('Validation failed: Invalid Solana address format');
      console.groupEnd();
      toast.error('Invalid Solana address', { dismissible: true });
      return;
    }
    
    // Convert SOL to lamports
    const lamports = Number(amount) * LAMPORTS_PER_SOL;
    if (isNaN(lamports) || lamports <= 0) {
      console.warn('Validation failed: Invalid amount');
      console.groupEnd();
      toast.error('Invalid amount', { dismissible: true });
      return;
    }

    console.log('Transaction params:', {
      from: publicKey.toBase58(),
      to: recipientPubkey.toBase58(),
      lamports: `${lamports} lamports`,
      sol: `${amount} SOL`
    });
    console.groupEnd();

    setIsLoading(true);
    let toastId: string | number | undefined;

    try {
      console.group('🚀 [SOL-TX] Creating Transaction');

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      console.log('Getting recent blockhash...');
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      console.log('Transaction prepared with blockhash:', blockhash);

      console.log('Sending via wallet adapter...');
      const signature = await sendTransaction(transaction, connection);
      console.log('✅ Transaction sent successfully');
      console.log('Signature:', signature);
      console.groupEnd();
      
      // Show loading toast with Solscan link
      console.log('🎯 [SOL-TX] Displaying loading toast for signature:', signature);
      toastId = toast.loading(
        <div className="flex flex-col gap-1">
          <div>Solana transaction sent!</div>
          <a 
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            View on Solscan: {signature.slice(0, 8)}...
          </a>
        </div>,
        {
          duration: Infinity,
          dismissible: true,
        }
      );

      console.group('🔄 [SOL-TX] Waiting for Confirmation');
      console.log('Confirming transaction...');
      const confirmation = await connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        console.error('Transaction failed on-chain:', confirmation.value.err);
        console.groupEnd();
        toast.error('Transaction failed', { id: toastId, dismissible: true });
      } else {
        console.log('✅ Transaction confirmed successfully');
        console.log('Confirmation details:', {
          err: confirmation.value.err,
          // Note: slot and confirmations may not be available on all SignatureResult types
        });
        console.groupEnd();
        
        toast.success(
          <div className="flex flex-col gap-1">
            <div>Solana transaction confirmed!</div>
            <a 
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              View on Solscan: {signature.slice(0, 8)}...
            </a>
          </div>,
          { id: toastId, dismissible: true }
        );
      }
      
    } catch (err) {
      console.group('❌ [SOL-TX] Transaction Error');
      console.error('Error details:', err);
      console.groupEnd();
      
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(`Transaction failed: ${errorMessage}`, { id: toastId, dismissible: true });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, to, amount, sendTransaction]);

  const isValidAddress = to === '' || (() => {
    try {
      new PublicKey(to);
      return true;
    } catch {
      return false;
    }
  })();
  
  const isValidAmount = amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0;
  const canSubmit = isValidAddress && isValidAmount && to !== '' && !isLoading && publicKey;

  return (
    <Card className="w-full max-w-md">
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
            {!isValidAddress && (
              <div className="text-red-500 text-sm">Invalid Solana address</div>
            )}
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
            {!isValidAmount && amount !== '' && (
              <div className="text-red-500 text-sm">Invalid amount</div>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isLoading ? 'Sending...' : 'Send Transaction'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}