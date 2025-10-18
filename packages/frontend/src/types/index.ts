/**
 * @file Frontend TypeScript type definitions
 * @description Shared types for the MedTrace frontend application
 */

/**
 * Stakeholder roles in the pharmaceutical supply chain
 */
export const StakeholderRole = {
  None: 0,
  Manufacturer: 1,
  Distributor: 2,
  Pharmacist: 3,
} as const;

export type StakeholderRoleType = (typeof StakeholderRole)[keyof typeof StakeholderRole];

/**
 * Represents a pharmaceutical batch NFT
 */
export interface Batch {
  tokenId: number;
  manufacturer: string;
  tokenURI: string;
  currentOwner: string;
  mintedAt?: number;
}

/**
 * Represents a supply chain event logged for a batch
 */
export interface BatchEvent {
  tokenId: number;
  logger: string;
  timestamp: number;
  eventData: string;
}

/**
 * Represents a custody transfer record
 */
export interface CustodyRecord {
  tokenId: number;
  from: string;
  to: string;
  timestamp: number;
}

/**
 * Paginated API response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Batch details with full history
 */
export interface BatchDetails extends Batch {
  events: BatchEvent[];
  custodyHistory: CustodyRecord[];
}

/**
 * Contract addresses configuration
 */
export interface ContractAddresses {
  stakeholderRegistry: string;
  digitalBatch: string;
  trackAndTrace: string;
  supplyChainEvents: string;
  partnershipRegistry: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contracts: ContractAddresses;
}
