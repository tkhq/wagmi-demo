'use client';

import { useState } from 'react';
import { Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sha256, toBytes } from 'viem';

// Inline Google icon (extracted from original code)
function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z"
        fill="#FFC107"
      />
      <path
        d="M3.15302 7.3455L6.43852 9.755C7.32752 7.554 9.48052 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15902 2 4.82802 4.1685 3.15302 7.3455Z"
        fill="#FF3D00"
      />
      <path
        d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z"
        fill="#4CAF50"
      />
      <path
        d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z"
        fill="#1976D2"
      />
    </svg>
  );
}

export type GoogleAuthButtonProps = {
  onGoogleSuccess?: (idToken: string) => void;
  iframePublicKey: string;
};

export function GoogleAuthButton({
  onGoogleSuccess,
  iframePublicKey,
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);

    const nonce = sha256(iframePublicKey as `0x${string}`).replace(/^0x/, '');

    const redirectURI = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!.replace(
      /\/$/,
      ''
    );
    const googleAuthUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    googleAuthUrl.searchParams.set(
      'client_id',
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
    );
    googleAuthUrl.searchParams.set('redirect_uri', redirectURI);
    googleAuthUrl.searchParams.set('response_type', 'id_token');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('nonce', nonce);
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const authWindow = window.open(
      googleAuthUrl.toString(),
      '_blank',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
    if (!authWindow) {
      console.error('Failed to open Google login window.');
      setLoading(false);
      return;
    }
    const interval = setInterval(() => {
      try {
        const url = authWindow.location.href;
        if (url.startsWith(window.location.origin)) {
          const hashParams = new URLSearchParams(url.split('#')[1]);
          const idToken = hashParams.get('id_token');
          if (idToken) {
            clearInterval(interval);
            authWindow.close();
            setLoading(false);
            onGoogleSuccess?.(idToken);
          }
        }
      } catch {}
      if (authWindow.closed) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <Button
      variant="outline"
      className="w-full rounded-full h-12 border-2 border-[#7C3AED] hover:bg-[#7C3AED]/5 flex items-center justify-center relative"
      onClick={loading ? undefined : handleGoogleLogin}
    >
      <span className="absolute left-4">
        {loading ? <Loader className="animate-spin h-5 w-5" /> : <GoogleIcon />}
      </span>
      <span>Gmail</span>
    </Button>
  );
}
