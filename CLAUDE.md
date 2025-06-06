# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development server:
```bash
npm run dev  # Starts Next.js dev server with turbopack
```

Build and deployment:
```bash
npm run build  # Production build
npm start      # Start production server
```

Code quality:
```bash
npm run lint   # Run ESLint
```

## Architecture

This is a Next.js 15 demo application showcasing Turnkey wallet integration with both Ethereum (via Wagmi) and Solana wallets.

### Core Integration Flow
1. **Authentication**: Google OAuth → Turnkey suborg creation → session establishment
2. **Wallet Connection**: Turnkey iframe client → custom Wagmi connector + Solana adapter
3. **Multi-chain Support**: Ethereum (Holesky testnet) via Wagmi, Solana via wallet-adapter

### Key Files
- `src/lib/turnkey.ts`: Turnkey iframe client initialization and singleton management
- `src/lib/connector.ts`: Custom Wagmi connector implementing EIP-1193 provider interface
- `src/lib/eip1193-provider.ts`: Ethereum provider implementation using Turnkey SDK
- `src/lib/turnkey-sol-adapter.ts`: Solana wallet adapter for Turnkey
- `src/lib/actions.ts`: Server actions for Turnkey OAuth and suborg management
- `src/components/providers.tsx`: React context providers (Wagmi + Solana + React Query)

### Provider Hierarchy
```
WagmiProvider (Ethereum)
└── SolanaProvider (Solana wallet context)
    └── QueryClientProvider (React Query)
        └── App Components
```

### Environment Variables
Required for Turnkey integration (see `env.example`):
- `NEXT_PUBLIC_ORGANIZATION_ID`: Turnkey organization ID
- `NEXT_PUBLIC_RPID`: Relying party ID for WebAuthn
- `NEXT_PUBLIC_BASE_URL`: Turnkey API base URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `TURNKEY_API_PRIVATE_KEY`: Server-side Turnkey API key
- `TURNKEY_API_PUBLIC_KEY`: Server-side Turnkey API public key

### Custom Components
- Dual wallet support: `account.ethereum.tsx` and `account.solana.tsx`
- Message signing: `sign-message.tsx` and `sign-message.solana.tsx`
- Authentication: `auth-modal.tsx` with Google OAuth integration

The app demonstrates embedded wallet creation, multi-chain account management, and transaction signing without users needing to manage private keys directly.