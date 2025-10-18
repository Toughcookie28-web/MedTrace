/**
 * @title MedTrace Backend Type Definitions
 * @notice TypeScript type definitions for the MedTrace backend API
 */

/**
 * Stakeholder roles in the pharmaceutical supply chain
 */
export enum StakeholderRole {
  None = 0,
  Manufacturer = 1,
  Distributor = 2,
  Pharmacist = 3,
}

/**
 * Role name mapping for display purposes
 */
export const RoleNames: Record<StakeholderRole, string> = {
  [StakeholderRole.None]: "None",
  [StakeholderRole.Manufacturer]: "Manufacturer",
  [StakeholderRole.Distributor]: "Distributor",
  [StakeholderRole.Pharmacist]: "Pharmacist",
};

/**
 * Pharmaceutical batch information
 */
export interface Batch {
  tokenId: number;
  owner: string;
  tokenURI: string;
  manufacturer?: string;
  createdAt?: number;
}

/**
 * Supply chain event
 */
export interface Event {
  logger: string;
  timestamp: number;
  eventData: string;
  blockNumber?: number;
  transactionHash?: string;
}

/**
 * Custody transfer record
 */
export interface CustodyRecord {
  from: string;
  to: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
}

/**
 * Indexed batch information with full history
 */
export interface IndexedBatch {
  tokenId: number;
  owner: string;
  tokenURI: string;
  manufacturer: string;
  mintedAt: number;
  mintedAtBlock: number;
  custodyHistory: CustodyRecord[];
  events: Event[];
}

/**
 * Stakeholder information
 */
export interface Stakeholder {
  address: string;
  role: StakeholderRole;
  roleName: string;
}

/**
 * API response wrapper for successful responses
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: number;
}

/**
 * API response wrapper for error responses
 */
export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  timestamp: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  version: string;
  network: {
    name: string;
    chainId: number;
    connected: boolean;
  };
  contracts: {
    stakeholderRegistry: {
      address: string;
      deployed: boolean;
    };
    digitalBatch: {
      address: string;
      deployed: boolean;
    };
    trackAndTrace: {
      address: string;
      deployed: boolean;
    };
  };
  timestamp: number;
}

/**
 * Contract deployment information
 */
export interface DeploymentInfo {
  network: string;
  chainId: number;
  contracts: {
    StakeholderRegistry: string;
    DigitalBatch: string;
    TrackAndTrace: string;
  };
}

/**
 * Batch query options
 */
export interface BatchQueryOptions {
  includeHistory?: boolean;
  includeEvents?: boolean;
  offset?: number;
  limit?: number;
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  offset?: number;
  limit?: number;
  fromBlock?: number;
  toBlock?: number;
}

/**
 * Custody query options
 */
export interface CustodyQueryOptions {
  offset?: number;
  limit?: number;
  fromBlock?: number;
  toBlock?: number;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  contracts: {
    stakeholderRegistry: string;
    digitalBatch: string;
    trackAndTrace: string;
    supplyChainEvents: string;
  };
}
