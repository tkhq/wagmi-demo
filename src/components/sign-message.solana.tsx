'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Hex, toHex } from 'viem';

export function SignMessageSolana() {
  const [message, setMessage] = useState<string>('Example Message');
  const [data, setData] = useState<Hex>();

  // Hook to sign the message

  const { connection } = useConnection();
  const {
    publicKey,
    connect: connectSolanaWallet,
    select,
    wallets,
    wallet,
    signMessage: signSolMessage,
  } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message && signSolMessage) {
      const data = await signSolMessage(new TextEncoder().encode(message));
      setData(toHex(data));
    }
  };

  useEffect(() => {
    console.log('connector status', status);
  }, [status]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign Message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              placeholder="Enter your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* {error && <div className="text-red-500 text-sm">{error.message}</div>} */}

          {data && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-muted-foreground text-sm break-all shadow-inner bg-transparent rounded-sm font-mono">
                  {data}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!message}>
            Sign Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
