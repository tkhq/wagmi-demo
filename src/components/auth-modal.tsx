'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { useTurnkey } from '@turnkey/sdk-react';

export function AuthModal({
  isOpen = false,
  onClose,
  onGoogleSuccess,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  onGoogleSuccess?: (idToken: string) => void;
}) {
  const [open, setOpen] = useState(isOpen);
  const [loading, setLoading] = useState(false);
  const { authIframeClient } = useTurnkey();

  // Sync local state with the isOpen prop
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (authIframeClient) {
      const updateIframeKey = async () => {
        setLoading(true);
        await authIframeClient.initEmbeddedKey();
        setLoading(false);
      };

      updateIframeKey();
    }
  }, [authIframeClient]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 relative">
          <DialogTitle className="text-center text-xl font-bold">
            Sign-up / Sign-in
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-full h-8 w-8 p-0"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="px-6 py-2">
          <p className="text-center text-sm text-muted-foreground mb-4">
            Use an embedded wallet to trade faster
          </p>

          <div className="space-y-3 mb-4">
            <OAuthButton provider="Telegram" icon={<TelegramIcon />} />
            {loading ? (
              <Button disabled>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </Button>
            ) : (
              <GoogleAuthButton
                onGoogleSuccess={onGoogleSuccess}
                iframePublicKey={authIframeClient?.iframePublicKey!}
              />
            )}
            <OAuthButton provider="X / Twitter" icon={<XIcon />} />
          </div>

          <div className="space-y-3 mb-4">
            <Input
              type="email"
              placeholder="Email"
              className="rounded-full h-12"
            />
            <Button
              variant="default"
              className="w-full rounded-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              Continue
            </Button>
          </div>

          <DividerWithText>Or continue with an existing wallet</DividerWithText>

          <div className="space-y-3 mt-4">
            <WalletButton type="evm" label="EVM wallet">
              <ChainIcon name="ethereum" />
              <ChainIcon name="coinbase" />
              <ChainIcon name="binance" />
              <ChainIcon name="gmx" />
              <ChainIcon name="bitcoin" />
            </WalletButton>
            <WalletButton type="solana" label="Solana wallet">
              <ChainIcon name="solana" />
            </WalletButton>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 flex justify-center">
          <p className="text-xs text-center text-muted-foreground">
            By selecting one of the options you are agree to our{' '}
            <Link href="/tos" className="text-[#7C3AED] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#7C3AED] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OAuthButton({
  provider,
  icon,
  onClick,
}: {
  provider: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full rounded-full h-12 border-2 border-[#7C3AED] hover:bg-[#7C3AED]/5 flex items-center justify-center relative"
      onClick={onClick}
    >
      <span className="absolute left-4">{icon}</span>
      <span>{provider}</span>
    </Button>
  );
}

function WalletButton({
  type,
  label,
  children,
}: {
  type: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      className="w-full rounded-full h-12 border-2 hover:bg-[#7C3AED]/5 flex items-center justify-between px-4"
    >
      <span>{label}</span>
      <div className="flex items-center space-x-1">{children}</div>
    </Button>
  );
}

function DividerWithText({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center py-4" role="separator">
      <div className="flex-grow border-t border-gray-200"></div>
      <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase">
        {children}
      </span>
      <div className="flex-grow border-t border-gray-200"></div>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="12" fill="#29B6F6" />
      <path
        d="M17.5 8.5L15.5 16.5L11.5 13.5L9.5 15.5L10 11.5L17.5 8.5Z"
        fill="white"
      />
      <path d="M10 11.5L16 9L12 13L10 11.5Z" fill="#B0E9FF" />
      <path d="M11.5 13.5L10.5 16.5L9.5 15.5L11.5 13.5Z" fill="#B0E9FF" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
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

function XIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.1761 4H19.9362L13.9061 10.7774L21 20H15.4456L11.0951 14.4031L6.11723 20H3.35544L9.83156 12.7226L3 4H8.69545L12.6279 9.0969L17.1761 4ZM16.2073 18.3854H17.7368L7.86441 5.53908H6.2232L16.2073 18.3854Z"
        fill="black"
      />
    </svg>
  );
}

function ChainIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    ethereum: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#627EEA" />
        <path d="M10 4V8.04L13.36 9.52L10 4Z" fill="white" fillOpacity="0.6" />
        <path d="M10 4L6.64 9.52L10 8.04V4Z" fill="white" />
        <path
          d="M10 13.76V16L13.36 11.04L10 13.76Z"
          fill="white"
          fillOpacity="0.6"
        />
        <path d="M10 16V13.76L6.64 11.04L10 16Z" fill="white" />
        <path
          d="M10 12.92L13.36 10.2L10 8.48V12.92Z"
          fill="white"
          fillOpacity="0.6"
        />
        <path d="M6.64 10.2L10 12.92V8.48L6.64 10.2Z" fill="white" />
      </svg>
    ),
    coinbase: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#0052FF" />
        <path
          d="M10 15C12.7614 15 15 12.7614 15 10C15 7.23858 12.7614 5 10 5C7.23858 5 5 7.23858 5 10C5 12.7614 7.23858 15 10 15Z"
          fill="white"
        />
        <path d="M8.5 8.5H11.5V11.5H8.5V8.5Z" fill="#0052FF" />
      </svg>
    ),
    binance: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#F3BA2F" />
        <path
          d="M7.64 9.16L10 6.8L12.36 9.16L13.6 7.92L10 4.32L6.4 7.92L7.64 9.16Z"
          fill="white"
        />
        <path
          d="M6.4 10.4L7.64 9.16L8.88 10.4L7.64 11.64L6.4 10.4Z"
          fill="white"
        />
        <path
          d="M10 13.76L7.64 11.4L6.4 12.64L10 16.24L13.6 12.64L12.36 11.4L10 13.76Z"
          fill="white"
        />
        <path
          d="M11.12 10.4L12.36 9.16L13.6 10.4L12.36 11.64L11.12 10.4Z"
          fill="white"
        />
        <path d="M10 6.8L11.24 8.04L10 9.28L8.76 8.04L10 6.8Z" fill="white" />
        <path
          d="M10 13.76L11.24 12.52L10 11.28L8.76 12.52L10 13.76Z"
          fill="white"
        />
      </svg>
    ),
    gmx: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#1E293B" />
        <path d="M14 7L10 11L6 7L4 9L10 15L16 9L14 7Z" fill="white" />
      </svg>
    ),
    bitcoin: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#F7931A" />
        <path
          d="M13.24 8.76C13.3867 7.56 12.4533 6.96 11.2 6.56L11.6 4.8L10.52 4.52L10.12 6.24C9.84 6.16 9.56 6.12 9.28 6.04L9.68 4.32L8.6 4.04L8.2 5.8C7.97333 5.73333 7.74667 5.66667 7.52 5.6L6 5.2L5.68 6.36C5.68 6.36 6.48 6.52 6.44 6.56C6.92 6.68 7 7 6.96 7.24L6.48 9.28C6.50667 9.28 6.54667 9.29333 6.6 9.32C6.57333 9.32 6.54667 9.30667 6.52 9.28L5.88 12C5.82667 12.1333 5.69333 12.3333 5.36 12.24C5.38667 12.2933 4.6 12.08 4.6 12.08L4 13.32L5.44 13.72C5.70667 13.8 5.96 13.88 6.2 13.96L5.8 15.76L6.88 16.04L7.28 14.28C7.57333 14.36 7.85333 14.44 8.12 14.52L7.72 16.28L8.8 16.56L9.2 14.76C10.88 15.08 12.12 14.96 12.68 13.44C13.1333 12.2 12.7467 11.4533 11.92 10.96C12.52 10.8267 12.9733 10.44 13.12 9.56L13.24 8.76ZM10.8 12.68C10.48 13.92 8.36 13.24 7.64 13.04L8.2 10.64C8.92 10.84 11.1333 11.4 10.8 12.68ZM11.12 9.52C10.8267 10.6533 9.04 10.08 8.44 9.92L8.96 7.76C9.56 7.92 11.4267 8.34667 11.12 9.52Z"
          fill="white"
        />
      </svg>
    ),
    solana: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="10" cy="10" r="10" fill="#000000" />
        <path d="M6.5 12.5L13.5 5.5H8.5L5.5 8.5L6.5 12.5Z" fill="#00FFA3" />
        <path d="M13.5 14.5L6.5 7.5H11.5L14.5 10.5L13.5 14.5Z" fill="#00FFA3" />
        <path d="M7.5 6L14.5 13H9.5L6.5 10L7.5 6Z" fill="#00FFA3" />
      </svg>
    ),
  };

  return (
    <div className="w-5 h-5">
      {icons[name] || <div className="w-5 h-5 bg-gray-200 rounded-full" />}
    </div>
  );
}
