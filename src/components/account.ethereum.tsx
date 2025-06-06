import { useAccount, useBalance } from 'wagmi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatEther } from 'viem';

export const EthereumAccount = () => {
  const { address, isConnected } = useAccount();
  const { data: balance, isError, isLoading } = useBalance({
    address: address,
  });
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
          <>
            <p>
              <strong>Address:</strong>{' '}
              <code className="font-mono break-all">{address}</code>
            </p>
            <p>
              <strong>Balance:</strong>{' '}
              <span className="font-mono">
                {isLoading ? 'Loading...' : isError ? 'Error' : balance ? `${formatEther(balance.value)} ETH` : '0 ETH'}
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
