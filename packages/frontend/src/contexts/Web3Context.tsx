/**
 * @file Web3 Context Provider
 * @description Manages wallet connection, contract instances, and blockchain state
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers';
import { NETWORKS } from '../config';
import type { NetworkConfig } from '../types';

// Import contract ABIs
import StakeholderRegistryABI from '../contracts/StakeholderRegistry.json';
import DigitalBatchABI from '../contracts/DigitalBatch.json';
import TrackAndTraceABI from '../contracts/TrackAndTrace.json';
import SupplyChainEventsABI from '../contracts/SupplyChainEvents.json';
import PartnershipRegistryABI from '../contracts/PartnershipRegistry.json';

interface Web3ContextType {
  // Wallet connection
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Network
  network: NetworkConfig | null;
  switchNetwork: (chainId: number) => Promise<void>;

  // Contract instances
  stakeholderRegistry: Contract | null;
  digitalBatch: Contract | null;
  trackAndTrace: Contract | null;
  supplyChainEvents: Contract | null;
  partnershipRegistry: Contract | null;

  // Provider
  provider: BrowserProvider | null;
  signer: any | null;

  // Contracts object for easier access
  contracts: {
    stakeholderRegistry: Contract | null;
    digitalBatch: Contract | null;
    trackAndTrace: Contract | null;
    supplyChainEvents: Contract | null;
    partnershipRegistry: Contract | null;
  };
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [network, setNetwork] = useState<NetworkConfig | null>(null);

  // Contract instances
  const [stakeholderRegistry, setStakeholderRegistry] = useState<Contract | null>(null);
  const [digitalBatch, setDigitalBatch] = useState<Contract | null>(null);
  const [trackAndTrace, setTrackAndTrace] = useState<Contract | null>(null);
  const [supplyChainEvents, setSupplyChainEvents] = useState<Contract | null>(null);
  const [partnershipRegistry, setPartnershipRegistry] = useState<Contract | null>(null);
  const [signer, setSigner] = useState<any | null>(null);

  /**
   * Initialize contract instances when provider and network are available
   */
  useEffect(() => {
    if (!provider || !network || !account) {
      return;
    }

    const initContracts = async () => {
      try {
        const contractSigner = await provider.getSigner();
        setSigner(contractSigner);

        // Initialize StakeholderRegistry
        const registry = new Contract(
          network.contracts.stakeholderRegistry,
          StakeholderRegistryABI.abi,
          contractSigner
        );
        setStakeholderRegistry(registry);

        // Initialize DigitalBatch
        const batch = new Contract(
          network.contracts.digitalBatch,
          DigitalBatchABI.abi,
          contractSigner
        );
        setDigitalBatch(batch);

        // Initialize TrackAndTrace
        const track = new Contract(
          network.contracts.trackAndTrace,
          TrackAndTraceABI.abi,
          contractSigner
        );
        setTrackAndTrace(track);

        // Initialize SupplyChainEvents
        const events = new Contract(
          network.contracts.supplyChainEvents,
          SupplyChainEventsABI.abi,
          contractSigner
        );
        setSupplyChainEvents(events);

        // Initialize PartnershipRegistry
        const partnership = new Contract(
          network.contracts.partnershipRegistry,
          PartnershipRegistryABI.abi,
          contractSigner
        );
        setPartnershipRegistry(partnership);

        console.log('✅ Contracts initialized successfully');
      } catch (error) {
        console.error('Failed to initialize contracts:', error);
      }
    };

    initContracts();
  }, [provider, network, account]);

  /**
   * Connect to MetaMask wallet
   */
  const connectWallet = async () => {
    console.log('🔌 Attempting to connect wallet...');
    console.log('🔍 Checking for window.ethereum...');

    if (!window.ethereum) {
      console.error('❌ window.ethereum not found!');
      alert(
        'MetaMask not detected!\n\n' +
        'Please make sure:\n' +
        '1. MetaMask extension is installed\n' +
        '2. MetaMask extension is enabled in your browser\n' +
        '3. You have refreshed the page after installing MetaMask\n\n' +
        'Install from: https://metamask.io'
      );
      return;
    }

    console.log('✓ window.ethereum found');

    try {
      console.log('📞 Requesting accounts from MetaMask...');

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      console.log('✓ Accounts received:', accounts);

      // Create provider
      const web3Provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const network = await web3Provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setProvider(web3Provider);
      setAccount(accounts[0]);
      setChainId(currentChainId);

      // Set network configuration
      const networkConfig = NETWORKS[currentChainId];
      if (networkConfig) {
        setNetwork(networkConfig);
      } else {
        console.warn(`Unsupported network: ${currentChainId}. Please switch to a supported network.`);
      }

      console.log('✅ Wallet connected:', accounts[0]);
      console.log('✅ Network:', currentChainId);
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);

      if (error.code === 4001) {
        alert('Connection rejected. Please approve the connection request in MetaMask.');
      } else {
        alert(`Failed to connect wallet: ${error.message || 'Unknown error'}\n\nPlease try again.`);
      }
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnectWallet = async () => {
    try {
      // Revoke MetaMask permissions to force account selection on next connect
      if (window.ethereum && window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
          console.log('✅ MetaMask permissions revoked');
        } catch (revokeError: any) {
          // Some wallets might not support wallet_revokePermissions
          console.log('⚠️ Permission revocation not supported:', revokeError.message);
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }

    // Clear application state
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setNetwork(null);
    setStakeholderRegistry(null);
    setDigitalBatch(null);
    setTrackAndTrace(null);
    setSupplyChainEvents(null);
    setPartnershipRegistry(null);
    setSigner(null);
    console.log('✅ Wallet disconnected');
  };

  /**
   * Switch to a different network
   */
  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) {
      alert('MetaMask is not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        const networkConfig = NETWORKS[targetChainId];
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${targetChainId.toString(16)}`,
                  chainName: networkConfig.name,
                  rpcUrls: [networkConfig.rpcUrl],
                },
              ],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
        }
      } else {
        console.error('Failed to switch network:', error);
      }
    }
  };

  /**
   * Listen to account and network changes
   */
  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        await disconnectWallet();
      } else {
        try {
          // Create new provider to get the new signer
          const web3Provider = new BrowserProvider(window.ethereum as Eip1193Provider);

          // Update account first
          setAccount(accounts[0]);
          console.log('✅ Account changed:', accounts[0]);

          // Update provider to trigger contract re-initialization with new signer
          setProvider(web3Provider);
          console.log('✅ Provider updated with new signer');
        } catch (error) {
          console.error('Failed to update provider on account change:', error);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);

      const networkConfig = NETWORKS[newChainId];
      if (networkConfig) {
        setNetwork(networkConfig);
        console.log('✅ Network changed:', networkConfig.name);
      } else {
        setNetwork(null);
        console.warn(`Unsupported network: ${newChainId}`);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  /**
   * Auto-connect if previously connected
   * Wait for MetaMask to inject window.ethereum (can take up to 3 seconds)
   */
  useEffect(() => {
    const autoConnect = async () => {
      // Wait for MetaMask injection with timeout
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds (30 * 100ms)

      while (!window.ethereum && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.ethereum) {
        console.log('⚠️ MetaMask not detected after 3 seconds');
        return;
      }

      console.log('✅ MetaMask detected');

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        }) as string[];

        if (accounts.length > 0) {
          console.log('🔄 Auto-connecting to previously connected account...');
          connectWallet();
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };

    autoConnect();
  }, []);

  const value: Web3ContextType = {
    account,
    chainId,
    isConnected: !!account && !!provider,
    connectWallet,
    disconnectWallet,
    network,
    switchNetwork,
    stakeholderRegistry,
    digitalBatch,
    trackAndTrace,
    supplyChainEvents,
    partnershipRegistry,
    provider,
    signer,
    contracts: {
      stakeholderRegistry,
      digitalBatch,
      trackAndTrace,
      supplyChainEvents,
      partnershipRegistry,
    },
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

/**
 * Custom hook to access Web3 context
 */
export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
