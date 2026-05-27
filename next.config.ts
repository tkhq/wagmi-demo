import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // @wagmi/connectors hard-depends on @walletconnect/ethereum-provider which pulls in
    // @reown/appkit-ui (Lit-based WalletConnect modal). Lit emits a dev-mode warning when
    // webpack resolves the "development" exports condition. Strip that condition so the
    // production Lit build is used everywhere, even in `next dev`.
    config.resolve.conditionNames = (config.resolve.conditionNames ?? []).filter(
      (c: string) => c !== "development"
    );
    return config;
  },
};

export default nextConfig;
