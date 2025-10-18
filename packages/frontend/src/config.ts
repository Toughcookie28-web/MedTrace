/**
 * @file Frontend Configuration
 * @description Configuration for contract addresses, network settings, and API endpoints
 */

import type { NetworkConfig } from './types';

/**
 * API base URL - defaults to localhost backend
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Supported network configurations
 */
export const NETWORKS: Record<number, NetworkConfig> = {
  // Hardhat localhost network
  31337: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      stakeholderRegistry: import.meta.env.VITE_STAKEHOLDER_REGISTRY_ADDRESS || '',
      digitalBatch: import.meta.env.VITE_DIGITAL_BATCH_ADDRESS || '',
      trackAndTrace: import.meta.env.VITE_TRACK_AND_TRACE_ADDRESS || '',
      supplyChainEvents: import.meta.env.VITE_SUPPLY_CHAIN_EVENTS_ADDRESS || '',
      partnershipRegistry: import.meta.env.VITE_PARTNERSHIP_REGISTRY_ADDRESS || '',
    },
  },
  // Sepolia testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || '',
    contracts: {
      stakeholderRegistry: import.meta.env.VITE_SEPOLIA_STAKEHOLDER_REGISTRY_ADDRESS || '',
      digitalBatch: import.meta.env.VITE_SEPOLIA_DIGITAL_BATCH_ADDRESS || '',
      trackAndTrace: import.meta.env.VITE_SEPOLIA_TRACK_AND_TRACE_ADDRESS || '',
      supplyChainEvents: import.meta.env.VITE_SEPOLIA_SUPPLY_CHAIN_EVENTS_ADDRESS || '',
      partnershipRegistry: import.meta.env.VITE_SEPOLIA_PARTNERSHIP_REGISTRY_ADDRESS || '',
    },
  },
};

/**
 * Default network (Localhost for development)
 */
export const DEFAULT_CHAIN_ID = 31337;

/**
 * Role display names
 */
export const ROLE_NAMES: Record<number, string> = {
  0: 'None',
  1: 'Manufacturer',
  2: 'Distributor',
  3: 'Pharmacist',
};
