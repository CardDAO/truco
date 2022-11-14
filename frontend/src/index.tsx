import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';
import App from './App';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  chain,
  configureChains,
  createClient,
  WagmiConfig,
} from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

/**
 * Create config and init client web3
 */
const { chains, provider } = configureChains(
  [ chain.hardhat, chain.goerli, chain.mainnet ],
  [
    publicProvider()
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'Trucazo',
  chains
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider
})


/**
 * init app
 */
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
            <App />
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);
