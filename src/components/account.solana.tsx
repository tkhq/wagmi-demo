import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const SolanaAccount = () => {
  const { publicKey, wallet } = useWallet();
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
          <p>
            <strong>Public Key:</strong>{' '}
            <code className="font-mono break-all">{publicKey.toBase58()}</code>
          </p>
        ) : (
          <p className="text-muted">No wallet connected</p>
        )}
      </CardContent>
    </Card>
  );
};
