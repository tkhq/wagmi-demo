import { useAccount } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const EthereumAccount = () => {
  const { address, isConnected } = useAccount();
  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>Ethereum Account</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Status:</strong>{' '}
          <span className="font-mono">
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </p>
        {address ? (
          <p>
            <strong>Address:</strong>{' '}
            <code className="font-mono break-all">{address}</code>
          </p>
        ) : (
          <p className="text-muted">No wallet connected</p>
        )}
      </CardContent>
    </Card>
  );
};
