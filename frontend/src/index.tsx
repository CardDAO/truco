import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { EthersJS } from './hooks/providers/EthersJS'
import App from './App';

export const EthersJSContext = React.createContext(new EthersJS(window.ethereum));

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <EthersJSContext.Provider value={new EthersJS(window.ethereum)}>
        <App />
    </EthersJSContext.Provider>
  </React.StrictMode>
);
