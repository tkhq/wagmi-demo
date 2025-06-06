import { base } from 'wagmi/chains';
import { createConfig, http } from 'wagmi';
import { walletConnector } from './connector';

export const config = createConfig({
  connectors: [walletConnector()],
  chains: [base],
  ssr: true,
  transports: {
    [base.id]: http(base.rpcUrls.default.http[0]),
  },
});
