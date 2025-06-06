import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const SolanaAccount = () => {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!publicKey || !connection) return;

    const fetchBalance = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setIsError(true);
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [publicKey, connection]);
  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>Solana Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Status:</strong>{' '}
          <span className="font-mono">
            {wallet?.adapter?.readyState ?? 'Not connected'}
          </span>
        </p>
        {publicKey ? (
          <>
            <p>
              <strong>Public Key:</strong>{' '}
              <code className="font-mono break-all">{publicKey.toBase58()}</code>
            </p>
            <p>
              <strong>Balance:</strong>{' '}
              <span className="font-mono">
                {isLoading ? 'Loading...' : isError ? 'Error' : balance !== null ? `${balance.toFixed(4)} SOL` : '0 SOL'}
              </span>
            </p>
          </>
        ) : (
          <p className="text-muted">No wallet connected</p>
        )}
      </CardContent>
    </Card>
  );
};
