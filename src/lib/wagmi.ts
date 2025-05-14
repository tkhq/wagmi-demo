import { holesky } from 'wagmi/chains';
import { createConfig, http } from 'wagmi';
import { walletConnector } from './connector';

export const config = createConfig({
  connectors: [walletConnector()],
  chains: [holesky],
  ssr: true,
  transports: {
    [holesky.id]: http(holesky.rpcUrls.default.http[0]),
  },
});
