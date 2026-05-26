import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

interface Props {
  address?: string;
}

export const SolanaAccount = ({ address: addressProp }: Props) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const displayAddress = addressProp ?? publicKey?.toBase58();
  const isConnected = addressProp ? true : connected;
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!displayAddress || !connection) return;

    const fetchBalance = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const lamports = await connection.getBalance(new PublicKey(displayAddress));
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
  }, [displayAddress, connection]);
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Solana Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Status:</strong>{' '}
          <span className="font-mono">{isConnected ? 'Connected' : 'Not connected'}</span>
        </p>
        {displayAddress ? (
          <>
            <p>
              <strong>Public Key:</strong>{' '}
              <code className="font-mono break-all">{displayAddress}</code>
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
