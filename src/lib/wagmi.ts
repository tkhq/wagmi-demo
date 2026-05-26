import { sepolia } from 'wagmi/chains';
import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { turnkeyWalletConnector } from './connector';

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const rpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  'https://ethereum-sepolia-rpc.publicnode.com';

export const config = createConfig({
  connectors: [
    injected(),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
    turnkeyWalletConnector(),
  ],
  chains: [sepolia],
  ssr: true,
  transports: {
    [sepolia.id]: http(rpcUrl),
  },
});
