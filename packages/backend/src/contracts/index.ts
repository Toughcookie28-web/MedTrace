/**
 * @title MedTrace Contract Interaction Layer
 * @notice Provides ethers.js contract instances and interaction utilities
 * @dev Manages provider setup, contract instances, and ABI imports
 */

import { ethers, Contract, JsonRpcProvider } from "ethers";
import { getNetworkConfig } from "../config";

// Import contract ABIs from compiled artifacts
// Note: In production, you would import from the compiled artifacts
// For this setup, we'll define the essential ABIs inline or import from a separate file

/**
 * StakeholderRegistry ABI - Essential functions
 */
const STAKEHOLDER_REGISTRY_ABI = [
  "function getRole(address stakeholder) external view returns (uint8)",
  "function addStakeholder(address stakeholder, uint8 role) external",
  "function removeStakeholder(address stakeholder) external",
  "function owner() external view returns (address)",
  "event StakeholderAdded(address indexed stakeholder, uint8 role)",
  "event StakeholderRemoved(address indexed stakeholder, uint8 previousRole)",
];

/**
 * DigitalBatch ABI - Essential functions
 */
const DIGITAL_BATCH_ABI = [
  "function mintBatch(address manufacturer, string memory tokenURI) external returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function custodyManager() external view returns (address)",
  "function stakeholderRegistry() external view returns (address)",
  "event BatchMinted(uint256 indexed tokenId, address indexed manufacturer, string tokenURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

/**
 * TrackAndTrace ABI - Essential functions
 */
const TRACK_AND_TRACE_ABI = [
  "function transferCustody(uint256 tokenId, address to) external",
  "function logEvent(uint256 tokenId, string memory eventData) external",
  "function acknowledgeReceipt(uint256 tokenId, string memory receiptData) external",
  "function isReceiptAcknowledged(uint256 tokenId, address stakeholder) external view returns (bool)",
  "function getBatchEvents(uint256 tokenId) external view returns (tuple(address logger, uint256 timestamp, string eventData)[])",
  "function getBatchEventsPaginated(uint256 tokenId, uint256 offset, uint256 limit) external view returns (tuple(address logger, uint256 timestamp, string eventData)[] eventsSlice, uint256 total)",
  "function getBatchEventCount(uint256 tokenId) external view returns (uint256)",
  "function getCustodyHistory(uint256 tokenId) external view returns (tuple(address from, address to, uint256 timestamp)[])",
  "function getCustodyHistoryPaginated(uint256 tokenId, uint256 offset, uint256 limit) external view returns (tuple(address from, address to, uint256 timestamp)[] records, uint256 total)",
  "function getCustodyHistoryCount(uint256 tokenId) external view returns (uint256)",
  "function stakeholderRegistry() external view returns (address)",
  "function digitalBatch() external view returns (address)",
  "event CustodyTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp)",
  "event EventLogged(uint256 indexed tokenId, address indexed logger, string eventData, uint256 timestamp)",
  "event ReceiptAcknowledged(uint256 indexed tokenId, address indexed acknowledger, string receiptData, uint256 timestamp)",
];

/**
 * SupplyChainEvents ABI - Essential functions
 */
const SUPPLY_CHAIN_EVENTS_ABI = [
  "function logEvent(uint256 tokenId, string memory temperature, string memory location, string memory notes, uint256 timestamp, bytes memory signature) external",
  "function getBatchEvents(uint256 tokenId) external view returns (tuple(uint256 tokenId, address reporter, string temperature, string location, string notes, uint256 timestamp, bytes signature)[])",
  "function getEventCount(uint256 tokenId) external view returns (uint256)",
  "event SensorDataLogged(uint256 indexed tokenId, address indexed reporter, string temperature, string location, uint256 timestamp)",
];

/**
 * Contract manager class
 */
export class ContractManager {
  private provider: JsonRpcProvider;
  private networkConfig: ReturnType<typeof getNetworkConfig>;

  public stakeholderRegistry: Contract;
  public digitalBatch: Contract;
  public trackAndTrace: Contract;
  public supplyChainEvents: Contract;

  constructor() {
    // Get network configuration
    this.networkConfig = getNetworkConfig();

    // Create provider
    this.provider = new ethers.JsonRpcProvider(this.networkConfig.rpcUrl);

    // Create contract instances
    this.stakeholderRegistry = new ethers.Contract(
      this.networkConfig.contracts.stakeholderRegistry,
      STAKEHOLDER_REGISTRY_ABI,
      this.provider
    );

    this.digitalBatch = new ethers.Contract(this.networkConfig.contracts.digitalBatch, DIGITAL_BATCH_ABI, this.provider);

    this.trackAndTrace = new ethers.Contract(this.networkConfig.contracts.trackAndTrace, TRACK_AND_TRACE_ABI, this.provider);

    this.supplyChainEvents = new ethers.Contract(
      this.networkConfig.contracts.supplyChainEvents,
      SUPPLY_CHAIN_EVENTS_ABI,
      this.provider
    );
  }

  /**
   * Get the provider instance
   */
  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();

    return {
      name: this.networkConfig.name,
      chainId: Number(network.chainId),
      blockNumber,
      connected: true,
    };
  }

  /**
   * Check if contract is deployed at address
   */
  async isContractDeployed(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== "0x";
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify all contracts are deployed
   */
  async verifyContracts(): Promise<{
    stakeholderRegistry: boolean;
    digitalBatch: boolean;
    trackAndTrace: boolean;
    supplyChainEvents: boolean;
  }> {
    const [stakeholderRegistry, digitalBatch, trackAndTrace, supplyChainEvents] = await Promise.all([
      this.isContractDeployed(this.networkConfig.contracts.stakeholderRegistry),
      this.isContractDeployed(this.networkConfig.contracts.digitalBatch),
      this.isContractDeployed(this.networkConfig.contracts.trackAndTrace),
      this.isContractDeployed(this.networkConfig.contracts.supplyChainEvents),
    ]);

    return {
      stakeholderRegistry,
      digitalBatch,
      trackAndTrace,
      supplyChainEvents,
    };
  }

  /**
   * Get contract addresses
   */
  getContractAddresses() {
    return {
      stakeholderRegistry: this.networkConfig.contracts.stakeholderRegistry,
      digitalBatch: this.networkConfig.contracts.digitalBatch,
      trackAndTrace: this.networkConfig.contracts.trackAndTrace,
      supplyChainEvents: this.networkConfig.contracts.supplyChainEvents,
    };
  }

  /**
   * Get StakeholderRegistry contract
   */
  getStakeholderRegistry(): Contract {
    return this.stakeholderRegistry;
  }

  /**
   * Get DigitalBatch contract
   */
  getDigitalBatch(): Contract {
    return this.digitalBatch;
  }

  /**
   * Get TrackAndTrace contract
   */
  getTrackAndTrace(): Contract {
    return this.trackAndTrace;
  }

  /**
   * Get SupplyChainEvents contract
   */
  getSupplyChainEvents(): Contract {
    return this.supplyChainEvents;
  }
}

// Singleton instance
let contractManager: ContractManager | null = null;

/**
 * Get or create contract manager instance
 */
export function getContractManager(): ContractManager {
  if (!contractManager) {
    contractManager = new ContractManager();
  }
  return contractManager;
}

/**
 * Initialize contracts (for startup)
 */
export async function initializeContracts(): Promise<void> {
  console.log("Initializing contract connections...");

  const manager = getContractManager();

  // Verify network connection
  const networkInfo = await manager.getNetworkInfo();
  console.log(`✓ Connected to ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);
  console.log(`  Current block: ${networkInfo.blockNumber}`);

  // Verify contracts are deployed
  const verification = await manager.verifyContracts();

  if (!verification.stakeholderRegistry) {
    throw new Error("StakeholderRegistry not deployed at configured address");
  }
  if (!verification.digitalBatch) {
    throw new Error("DigitalBatch not deployed at configured address");
  }
  if (!verification.trackAndTrace) {
    throw new Error("TrackAndTrace not deployed at configured address");
  }
  if (!verification.supplyChainEvents) {
    throw new Error("SupplyChainEvents not deployed at configured address");
  }

  console.log("✓ All contracts verified");

  const addresses = manager.getContractAddresses();
  console.log(`  StakeholderRegistry: ${addresses.stakeholderRegistry}`);
  console.log(`  DigitalBatch:        ${addresses.digitalBatch}`);
  console.log(`  TrackAndTrace:       ${addresses.trackAndTrace}`);
  console.log(`  SupplyChainEvents:   ${addresses.supplyChainEvents}`);
}

export default {
  getContractManager,
  initializeContracts,
  ContractManager,
};
