/**
 * @title MedTrace Backend Configuration
 * @notice Configuration management for the MedTrace backend API
 * @dev Loads configuration from environment variables with sensible defaults
 */

import dotenv from "dotenv";
import { NetworkConfig } from "./types";

// Load environment variables
dotenv.config();

/**
 * Server configuration
 */
export const serverConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "localhost",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
};

/**
 * Network selection
 */
export const currentNetwork = process.env.NETWORK || "localhost";

/**
 * Network configurations
 */
export const networks: Record<string, Partial<NetworkConfig>> = {
  localhost: {
    name: "localhost",
    rpcUrl: process.env.LOCALHOST_RPC_URL || "http://127.0.0.1:8545",
    chainId: 31337,
    contracts: {
      stakeholderRegistry: process.env.LOCALHOST_STAKEHOLDER_REGISTRY || "",
      digitalBatch: process.env.LOCALHOST_DIGITAL_BATCH || "",
      trackAndTrace: process.env.LOCALHOST_TRACK_AND_TRACE || "",
      supplyChainEvents: process.env.LOCALHOST_SUPPLY_CHAIN_EVENTS || "",
    },
  },
  sepolia: {
    name: "sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "",
    chainId: 11155111,
    contracts: {
      stakeholderRegistry: process.env.SEPOLIA_STAKEHOLDER_REGISTRY || "",
      digitalBatch: process.env.SEPOLIA_DIGITAL_BATCH || "",
      trackAndTrace: process.env.SEPOLIA_TRACK_AND_TRACE || "",
      supplyChainEvents: process.env.SEPOLIA_SUPPLY_CHAIN_EVENTS || "",
    },
  },
  polygonAmoy: {
    name: "polygon-amoy",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || "",
    chainId: 80002,
    contracts: {
      stakeholderRegistry: process.env.POLYGON_AMOY_STAKEHOLDER_REGISTRY || "",
      digitalBatch: process.env.POLYGON_AMOY_DIGITAL_BATCH || "",
      trackAndTrace: process.env.POLYGON_AMOY_TRACK_AND_TRACE || "",
      supplyChainEvents: process.env.POLYGON_AMOY_SUPPLY_CHAIN_EVENTS || "",
    },
  },
  polygon: {
    name: "polygon",
    rpcUrl: process.env.POLYGON_RPC_URL || "",
    chainId: 137,
    contracts: {
      stakeholderRegistry: process.env.POLYGON_STAKEHOLDER_REGISTRY || "",
      digitalBatch: process.env.POLYGON_DIGITAL_BATCH || "",
      trackAndTrace: process.env.POLYGON_TRACK_AND_TRACE || "",
      supplyChainEvents: process.env.POLYGON_SUPPLY_CHAIN_EVENTS || "",
    },
  },
};

/**
 * Get the current network configuration
 */
export function getNetworkConfig(): NetworkConfig {
  const config = networks[currentNetwork];

  if (!config) {
    throw new Error(`Network configuration not found for: ${currentNetwork}`);
  }

  if (!config.rpcUrl) {
    throw new Error(`RPC URL not configured for network: ${currentNetwork}`);
  }

  if (!config.contracts?.stakeholderRegistry || !config.contracts?.digitalBatch || !config.contracts?.trackAndTrace || !config.contracts?.supplyChainEvents) {
    throw new Error(`Contract addresses not configured for network: ${currentNetwork}`);
  }

  return config as NetworkConfig;
}

/**
 * Event indexing configuration
 */
export const indexerConfig = {
  enabled: process.env.INDEXER_ENABLED !== "false",
  pollingInterval: parseInt(process.env.INDEXER_POLLING_INTERVAL || "2000", 10), // 2 seconds
  batchSize: parseInt(process.env.INDEXER_BATCH_SIZE || "100", 10),
  startBlock: parseInt(process.env.INDEXER_START_BLOCK || "0", 10),
};

/**
 * Logging configuration
 */
export const loggingConfig = {
  level: process.env.LOG_LEVEL || "info",
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== "false",
};

/**
 * Cache configuration (for future use with Redis/etc)
 */
export const cacheConfig = {
  enabled: process.env.CACHE_ENABLED === "true",
  ttl: parseInt(process.env.CACHE_TTL || "300", 10), // 5 minutes
};

/**
 * API configuration
 */
export const apiConfig = {
  version: "1.0.0",
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || "100", 10),
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10),
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === "true",
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute
};

/**
 * Validate configuration on load
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Check network config
  try {
    const networkConfig = getNetworkConfig();

    if (!networkConfig.rpcUrl) {
      errors.push(`RPC URL not configured for network: ${currentNetwork}`);
    }

    if (!networkConfig.contracts.stakeholderRegistry) {
      errors.push("StakeholderRegistry contract address not configured");
    }

    if (!networkConfig.contracts.digitalBatch) {
      errors.push("DigitalBatch contract address not configured");
    }

    if (!networkConfig.contracts.trackAndTrace) {
      errors.push("TrackAndTrace contract address not configured");
    }

    if (!networkConfig.contracts.supplyChainEvents) {
      errors.push("SupplyChainEvents contract address not configured");
    }
  } catch (error: any) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    console.error("\n❌ Configuration Errors:");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\nPlease check your .env file and ensure all required variables are set.\n");
    throw new Error("Configuration validation failed");
  }
}

/**
 * Print configuration (for debugging)
 */
export function printConfig(): void {
  console.log("\n========================================");
  console.log("  Backend Configuration");
  console.log("========================================\n");

  console.log("Server:");
  console.log(`  Host:          ${serverConfig.host}`);
  console.log(`  Port:          ${serverConfig.port}`);
  console.log(`  Environment:   ${serverConfig.nodeEnv}`);
  console.log(`  CORS Origin:   ${serverConfig.corsOrigin}`);
  console.log();

  console.log("Network:");
  const networkConfig = getNetworkConfig();
  console.log(`  Name:          ${networkConfig.name}`);
  console.log(`  Chain ID:      ${networkConfig.chainId}`);
  console.log(`  RPC URL:       ${networkConfig.rpcUrl}`);
  console.log();

  console.log("Contracts:");
  console.log(`  StakeholderRegistry: ${networkConfig.contracts.stakeholderRegistry}`);
  console.log(`  DigitalBatch:        ${networkConfig.contracts.digitalBatch}`);
  console.log(`  TrackAndTrace:       ${networkConfig.contracts.trackAndTrace}`);
  console.log(`  SupplyChainEvents:   ${networkConfig.contracts.supplyChainEvents}`);
  console.log();

  console.log("Event Indexer:");
  console.log(`  Enabled:       ${indexerConfig.enabled}`);
  console.log(`  Polling:       ${indexerConfig.pollingInterval}ms`);
  console.log(`  Batch Size:    ${indexerConfig.batchSize}`);
  console.log();

  console.log("API:");
  console.log(`  Version:       ${apiConfig.version}`);
  console.log(`  Max Page Size: ${apiConfig.maxPageSize}`);
  console.log();
}

export default {
  server: serverConfig,
  network: currentNetwork,
  networks,
  getNetworkConfig,
  indexer: indexerConfig,
  logging: loggingConfig,
  cache: cacheConfig,
  api: apiConfig,
  validate: validateConfig,
  print: printConfig,
};
