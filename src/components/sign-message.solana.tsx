'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTurnkey } from '@turnkey/react-wallet-kit';
import { toHex, type Hex } from 'viem';

interface Props {
  address?: string;
}

export function SignMessageSolana({ address }: Props) {
  const [message, setMessage] = useState<string>('Example Message');
  const [data, setData] = useState<Hex>();
  const { signMessage } = useWallet();
  const { httpClient, session } = useTurnkey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    if (address) {
      if (!httpClient || !session?.organizationId) return;
      const { r, s, v } = await httpClient.signRawPayload({
        organizationId: session.organizationId,
        signWith: address,
        payload: message,
        encoding: 'PAYLOAD_ENCODING_TEXT_UTF8',
        hashFunction: 'HASH_FUNCTION_NOT_APPLICABLE',
      });
      setData(`0x${r}${s}${v}` as Hex);
    } else {
      if (!signMessage) return;
      const result = await signMessage(new TextEncoder().encode(message));
      setData(toHex(result));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign Message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sol-message">Message</Label>
            <Input
              id="sol-message"
              placeholder="Enter your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {data && (
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="text-muted-foreground text-sm break-all shadow-inner bg-transparent rounded-sm font-mono">
                  {data}
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!message || (!address && !signMessage)}>
            Sign Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
