# Turnkey Wallet Demo

Demonstrates embedding a Turnkey wallet into a dApp built on the most common multi-chain stack: **wagmi + RainbowKit** for Ethereum and **Solana wallet adapter** for Solana. Users connect through a single unified picker and can sign messages and send transactions on both chains — using either the Turnkey embedded wallet or any external wallet (MetaMask, Phantom, etc.).

> If you are building a new app and want to use external wallets alongside your Turnkey embedded wallets with multi-chain support, use [`@turnkey/react-wallet-kit`](https://docs.turnkey.com/sdks/react/using-external-wallets/overview) directly — it supports any wallet that follows EIP-6963 or the Solana Wallet Standard, and handles Ethereum and Solana out of the box without any custom connector code. This demo exists for cases where you already have a wagmi + Solana wallet adapter setup and need to slot a Turnkey wallet in alongside your existing external wallet flow, with minimal changes to your provider tree.

## What it shows

- **Embedded Turnkey wallet** — passkey, email OTP sign-up or sign-in via `@turnkey/react-wallet-kit`
- **External wallets** — injected EVM wallets (ex Metamask) and optionally WalletConnect via wagmi + RainbowKit; Wallet Standard Solana wallets (ex Phantom) via `@solana/wallet-adapter-react`
- **Multi-chain** — Ethereum (Sepolia) via wagmi; Solana (devnet) via `@solana/wallet-adapter-react`
- **Turnkey tx management** — `ethSendTransaction` / `solSendTransaction` + `pollTransactionStatus` for the Turnkey wallet path

## Quick start

```bash
pnpm install
cp .env.local.example .env.local   # fill in org ID and auth proxy vars
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_ORGANIZATION_ID` | ✅ | Turnkey parent org ID |
| `NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID` | ✅ | Auth proxy config ID — create one in the [Turnkey dashboard](https://app.turnkey.com) under **Integrations → Auth Proxy** |
| `NEXT_PUBLIC_AUTH_PROXY_BASE_URL` | — | Auth proxy base URL (defaults to `https://authproxy.turnkey.com`) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | — | WalletConnect project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com); WalletConnect connector is skipped if omitted |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | — | Custom Sepolia RPC (falls back to a public node) |

## Architecture

### The bridge pattern

wagmi connectors run outside React context. `TurnkeyProvider` exposes `handleLogin` and `httpClient` via React context. The bridge wires them together:

```
TurnkeyProvider
├── TurnkeyBridgeSync        ← syncs provider state into turnkeyBridge singleton
└── WagmiProvider
    └── QueryClientProvider
        └── SolanaProvider   ← ConnectionProvider → WalletProvider → WalletModalProvider
```

`src/lib/turnkey-bridge.ts` holds the module-level singleton. `src/components/turnkey-bridge-sync.tsx` is a null-rendering React component that keeps it in sync and resolves pending login promises when a session arrives.

### The custom WalletPicker

Turnkey is intentionally **not** registered with RainbowKit. If it were, clicking "Turnkey" in RainbowKit's modal would open both the RainbowKit "Connecting…" overlay and the Turnkey auth modal behind it — the user would never see the auth UI.

Instead, `src/components/wallet-picker.tsx` is a custom Radix dialog that replaces RainbowKit's picker for the initial connection step. It shows three groups:

| Group | Source | On select |
|---|---|---|
| **Turnkey** | hardcoded | triggers `handleTurnkeyLogin()` → auth modal → wagmi connect |
| **Ethereum wallets** | wagmi `useConnectors()` (EIP-6963 + WalletConnect) | `connect({ connector })` via wagmi |
| **Solana wallets** | `useWallet().wallets` (Wallet Standard) | `select(walletName)` via Solana adapter |

RainbowKit is still in the stack for its wagmi connector factory (`connectorsForWallets`) — it just never opens its own modal.

### Connect flow

**Turnkey path:**
1. User opens WalletPicker, selects Turnkey
2. `handleTurnkeyLogin()` opens the `TurnkeyProvider` auth modal directly (no RainbowKit overlay in the way)
3. `TurnkeyBridgeSync` detects `session + wallets` after authentication and resolves the pending promise
4. wagmi connector returns ETH accounts → connected on Ethereum
5. A `useEffect` in `page.tsx` detects `isTurnkeyConnected` and auto-selects the Turnkey Solana adapter → connected on Solana (same session, no second auth)

**External wallet path (ETH):**
1. User opens WalletPicker, selects MetaMask (or another injected wallet)
2. `connect({ connector })` via wagmi → standard wallet extension flow

**External wallet path (Solana):**
1. ETH is already connected; user opens WalletPicker from the Solana section
2. `select(walletName)` via Solana adapter → `autoConnect` fires `connect()` on the adapter

### Transaction flow

| Wallet | ETH send | SOL send |
|---|---|---|
| Turnkey | `ethSendTransaction` + `pollTransactionStatus` from `useTurnkey()` | `solSendTransaction` + `pollTransactionStatus` |
| External | wagmi `useSendTransaction` | wallet adapter `sendTransaction` |

### Key files

```
src/lib/
  turnkey-bridge.ts          module-level bridge singleton
  eip1193-provider.ts        EIP-1193 provider (uses bridge for signing)
  connector.ts               wagmi connector wrapping the EIP-1193 provider
  turnkey-sol-adapter.ts     Solana wallet adapter (uses bridge)
  wagmi.ts                   wagmi config (RainbowKit connectors + Turnkey connector)

src/components/
  wallet-picker.tsx          custom picker dialog (Turnkey + ETH wallets + SOL wallets)
  turnkey-bridge-sync.tsx    syncs TurnkeyProvider state → bridge
  providers.tsx              full provider tree
  send-transaction.tsx       ETH send (Turnkey vs external path)
  send-transaction.solana.tsx  SOL send (Turnkey vs external path)
```

