/**
 * @title MedTrace Event Indexer Service
 * @notice Indexes blockchain events for efficient querying
 * @dev Listens to BatchMinted, CustodyTransferred, and EventLogged events
 *      Stores events in memory for MVP (can be replaced with database)
 */

import { EventLog } from "ethers";
import { getContractManager } from "../contracts";
import { indexerConfig } from "../config";
import { IndexedBatch, Event, CustodyRecord } from "../types";

/**
 * SSE Client connection type
 */
type SSEClient = {
  id: string;
  res: any;
};

/**
 * Event Indexer Service with Real-time SSE Support
 */
export class EventIndexer {
  private batches: Map<number, IndexedBatch> = new Map();
  private isIndexing: boolean = false;
  private lastIndexedBlock: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private sseClients: Set<SSEClient> = new Set();

  constructor() {
    console.log("Event Indexer initialized");
  }

  /**
   * Start the event indexer
   */
  async start(): Promise<void> {
    if (this.isIndexing) {
      console.log("Event indexer already running");
      return;
    }

    console.log("Starting event indexer with REAL-TIME event listeners...");
    this.isIndexing = true;

    const contractManager = getContractManager();
    const provider = contractManager.getProvider();

    // Get current block number
    const currentBlock = await provider.getBlockNumber();

    // Detect blockchain restart: if current block is less than last indexed block
    if (this.lastIndexedBlock > 0 && currentBlock < this.lastIndexedBlock) {
      console.log(`⚠️  Blockchain restart detected! Current block (${currentBlock}) < Last indexed (${this.lastIndexedBlock})`);
      console.log("🗑️  Clearing stale cache...");
      this.batches.clear();
      this.lastIndexedBlock = 0;
      console.log("✓ Cache cleared");
    }

    this.lastIndexedBlock = Math.max(indexerConfig.startBlock, currentBlock - 1000); // Start from last 1000 blocks or configured start

    console.log(`Indexing from block ${this.lastIndexedBlock} to ${currentBlock}`);

    // Index historical events
    await this.indexHistoricalEvents();

    // Start real-time event listeners
    this.startRealtimeListeners();

    console.log("✓ Event indexer started with real-time listeners");
  }

  /**
   * Stop the event indexer
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Remove all event listeners
    const contractManager = getContractManager();
    const digitalBatch = contractManager.getDigitalBatch();
    const trackAndTrace = contractManager.getTrackAndTrace();

    digitalBatch.removeAllListeners();
    trackAndTrace.removeAllListeners();

    this.isIndexing = false;
    console.log("Event indexer stopped");
  }

  /**
   * Index historical events from past blocks
   */
  private async indexHistoricalEvents(): Promise<void> {
    console.log("Indexing historical events...");

    const contractManager = getContractManager();
    const digitalBatch = contractManager.getDigitalBatch();
    const trackAndTrace = contractManager.getTrackAndTrace();
    const supplyChainEvents = contractManager.getSupplyChainEvents();
    const provider = contractManager.getProvider();

    const currentBlock = await provider.getBlockNumber();

    // Index BatchMinted events
    const batchMintedFilter = digitalBatch.filters.BatchMinted();
    const batchMintedEvents = await digitalBatch.queryFilter(batchMintedFilter, this.lastIndexedBlock, currentBlock);

    for (const event of batchMintedEvents) {
      await this.processBatchMintedEvent(event as EventLog);
    }

    // Index CustodyTransferred events
    const custodyFilter = trackAndTrace.filters.CustodyTransferred();
    const custodyEvents = await trackAndTrace.queryFilter(custodyFilter, this.lastIndexedBlock, currentBlock);

    for (const event of custodyEvents) {
      await this.processCustodyTransferredEvent(event as EventLog);
    }

    // Index EventLogged events
    const eventLoggedFilter = trackAndTrace.filters.EventLogged();
    const eventLoggedEvents = await trackAndTrace.queryFilter(eventLoggedFilter, this.lastIndexedBlock, currentBlock);

    for (const event of eventLoggedEvents) {
      await this.processEventLoggedEvent(event as EventLog);
    }

    // Index SensorDataLogged events from SupplyChainEvents contract
    const sensorDataFilter = supplyChainEvents.filters.SensorDataLogged();
    const sensorDataEvents = await supplyChainEvents.queryFilter(sensorDataFilter, this.lastIndexedBlock, currentBlock);

    for (const event of sensorDataEvents) {
      await this.processSensorDataLoggedEvent(event as EventLog);
    }

    this.lastIndexedBlock = currentBlock;
    console.log(`✓ Indexed ${batchMintedEvents.length} batches, ${custodyEvents.length} transfers, ${eventLoggedEvents.length} events, ${sensorDataEvents.length} sensor readings`);
  }

  /**
   * Start polling-based event indexing (avoids Hardhat filter bugs)
   */
  private startRealtimeListeners(): void {
    console.log("🎧 Setting up polling-based event indexing...");

    // Add initial delay to allow blockchain to settle after historical indexing
    setTimeout(() => {
      // Poll for new events every 2 seconds for reliable event catching
      this.pollingInterval = setInterval(async () => {
        try {
          await this.pollForNewEvents();
        } catch (error) {
          console.error("Error polling for events:", error);
        }
      }, 2000); // Poll every 2 seconds

      console.log("✓ Polling-based indexing active (every 2s)");
    }, 1000); // Wait 1 second before starting polling
  }

  /**
   * Poll for new events using queryFilter (avoids filter polling issues)
   */
  private async pollForNewEvents(): Promise<void> {
    const contractManager = getContractManager();
    const digitalBatch = contractManager.getDigitalBatch();
    const trackAndTrace = contractManager.getTrackAndTrace();
    const supplyChainEvents = contractManager.getSupplyChainEvents();
    const provider = contractManager.getProvider();

    try {
      const currentBlock = await provider.getBlockNumber();

      // Detect blockchain restart during polling
      if (currentBlock < this.lastIndexedBlock) {
        console.log(`⚠️  Blockchain restart detected during polling! Current block (${currentBlock}) < Last indexed (${this.lastIndexedBlock})`);
        console.log("🗑️  Clearing stale cache...");
        this.batches.clear();
        this.lastIndexedBlock = 0;
        console.log("✓ Cache cleared - reindexing from scratch");

        // Broadcast cache clear to all SSE clients
        this.broadcastToClients({
          type: "CacheCleared",
          data: { reason: "blockchain_restart", currentBlock },
        });

        // Re-index from beginning
        await this.indexHistoricalEvents();
        return;
      }

      // Only poll if there are new blocks
      if (currentBlock <= this.lastIndexedBlock) {
        return;
      }

      const fromBlock = this.lastIndexedBlock + 1;
      const toBlock = currentBlock;

      // Query for BatchMinted events
      const batchMintedFilter = digitalBatch.filters.BatchMinted();
      const batchMintedEvents = await digitalBatch.queryFilter(batchMintedFilter, fromBlock, toBlock);

      for (const event of batchMintedEvents) {
        const eventLog = event as EventLog;
        await this.processBatchMintedEvent(eventLog);

        const tokenId = Number(eventLog.args[0]);
        const manufacturer = eventLog.args[1];
        const tokenURI = eventLog.args[2];

        console.log(`🔔 Detected event: BatchMinted - Token ID: ${tokenId}`);

        // Broadcast to SSE clients
        this.broadcastToClients({
          type: "BatchMinted",
          data: {
            tokenId,
            manufacturer,
            tokenURI,
          },
        });
      }

      // Query for CustodyTransferred events
      const custodyFilter = trackAndTrace.filters.CustodyTransferred();
      const custodyEvents = await trackAndTrace.queryFilter(custodyFilter, fromBlock, toBlock);

      for (const event of custodyEvents) {
        const eventLog = event as EventLog;
        await this.processCustodyTransferredEvent(eventLog);

        const tokenId = Number(eventLog.args[0]);
        const from = eventLog.args[1];
        const to = eventLog.args[2];
        const timestamp = Number(eventLog.args[3]);

        console.log(`🔔 Detected event: CustodyTransferred - Token ID: ${tokenId}`);

        // Broadcast to SSE clients
        this.broadcastToClients({
          type: "CustodyTransferred",
          data: {
            tokenId,
            from,
            to,
            timestamp,
          },
        });
      }

      // Query for EventLogged events
      const eventLoggedFilter = trackAndTrace.filters.EventLogged();
      const eventLoggedEvents = await trackAndTrace.queryFilter(eventLoggedFilter, fromBlock, toBlock);

      for (const event of eventLoggedEvents) {
        const eventLog = event as EventLog;
        await this.processEventLoggedEvent(eventLog);

        const tokenId = Number(eventLog.args[0]);
        const logger = eventLog.args[1];
        const eventData = eventLog.args[2];
        const timestamp = Number(eventLog.args[3]);

        console.log(`🔔 Detected event: EventLogged - Token ID: ${tokenId}`);

        // Broadcast to SSE clients
        this.broadcastToClients({
          type: "EventLogged",
          data: {
            tokenId,
            logger,
            eventData,
            timestamp,
          },
        });
      }

      // Query for ReceiptAcknowledged events
      const receiptFilter = trackAndTrace.filters.ReceiptAcknowledged();
      const receiptEvents = await trackAndTrace.queryFilter(receiptFilter, fromBlock, toBlock);

      for (const event of receiptEvents) {
        const eventLog = event as EventLog;
        // Receipt data is already captured in EventLogged, so we just broadcast

        const tokenId = Number(eventLog.args[0]);
        const acknowledger = eventLog.args[1];
        const receiptData = eventLog.args[2];
        const timestamp = Number(eventLog.args[3]);

        console.log(`🔔 Detected event: ReceiptAcknowledged - Token ID: ${tokenId}`);

        // Broadcast to SSE clients
        this.broadcastToClients({
          type: "ReceiptAcknowledged",
          data: {
            tokenId,
            acknowledger,
            receiptData,
            timestamp,
          },
        });
      }

      // Query for SensorDataLogged events from SupplyChainEvents contract
      const sensorDataFilter = supplyChainEvents.filters.SensorDataLogged();
      const sensorDataEvents = await supplyChainEvents.queryFilter(sensorDataFilter, fromBlock, toBlock);

      for (const event of sensorDataEvents) {
        const eventLog = event as EventLog;
        await this.processSensorDataLoggedEvent(eventLog);

        const tokenId = Number(eventLog.args[0]);
        const reporter = eventLog.args[1];
        const temperature = eventLog.args[2];
        const location = eventLog.args[3];
        const timestamp = Number(eventLog.args[4]);

        console.log(`🔔 Detected event: SensorDataLogged - Token ID: ${tokenId}`);

        // Broadcast to SSE clients
        this.broadcastToClients({
          type: "SensorDataLogged",
          data: {
            tokenId,
            reporter,
            temperature,
            location,
            timestamp,
          },
        });
      }

      // Update last indexed block
      this.lastIndexedBlock = currentBlock;

    } catch (error) {
      console.error("Error in pollForNewEvents:", error);
    }
  }


  /**
   * Process BatchMinted event
   */
  private async processBatchMintedEvent(event: EventLog): Promise<void> {
    const tokenId = Number(event.args[0]);
    const manufacturer = event.args[1];
    const tokenURI = event.args[2];

    const batch: IndexedBatch = {
      tokenId,
      owner: manufacturer,
      tokenURI,
      manufacturer,
      mintedAt: 0, // Will be set from block timestamp
      mintedAtBlock: event.blockNumber,
      custodyHistory: [],
      events: [],
    };

    // Get block timestamp
    try {
      const block = await event.getBlock();
      batch.mintedAt = block.timestamp;
    } catch (error) {
      console.error(`Error getting block for batch ${tokenId}:`, error);
      batch.mintedAt = Math.floor(Date.now() / 1000);
    }

    this.batches.set(tokenId, batch);
  }

  /**
   * Process CustodyTransferred event
   */
  private async processCustodyTransferredEvent(event: EventLog): Promise<void> {
    const tokenId = Number(event.args[0]);
    const from = event.args[1];
    const to = event.args[2];
    const timestamp = Number(event.args[3]);

    const batch = this.batches.get(tokenId);
    if (!batch) {
      console.warn(`Batch ${tokenId} not found for custody transfer`);
      return;
    }

    // Update owner
    batch.owner = to;

    // Add to custody history
    batch.custodyHistory.push({
      from,
      to,
      timestamp,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  /**
   * Process EventLogged event
   */
  private async processEventLoggedEvent(event: EventLog): Promise<void> {
    const tokenId = Number(event.args[0]);
    const logger = event.args[1];
    const eventData = event.args[2];
    const timestamp = Number(event.args[3]);

    const batch = this.batches.get(tokenId);
    if (!batch) {
      console.warn(`Batch ${tokenId} not found for event logging`);
      return;
    }

    // Add to events
    batch.events.push({
      logger,
      timestamp,
      eventData,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    });
  }

  /**
   * Process SensorDataLogged event from SupplyChainEvents contract
   * Transforms sensor data into IoT format expected by verification page
   */
  private async processSensorDataLoggedEvent(event: EventLog): Promise<void> {
    const tokenId = Number(event.args[0]);
    const reporter = event.args[1];
    const temperature = event.args[2];
    const location = event.args[3];
    const timestamp = Number(event.args[4]);

    const batch = this.batches.get(tokenId);
    if (!batch) {
      console.warn(`Batch ${tokenId} not found for sensor data logging`);
      return;
    }

    // Get full sensor event data from contract to get notes and humidity
    const contractManager = getContractManager();
    const supplyChainEvents = contractManager.getSupplyChainEvents();

    try {
      const sensorEvents = await supplyChainEvents.getBatchEvents(tokenId);

      // Find the matching event (latest one if multiple)
      const matchingEvent = sensorEvents.length > 0 ? sensorEvents[sensorEvents.length - 1] : null;

      // Transform to IoT sensor reading format expected by verification page
      const eventData = JSON.stringify({
        type: "iot_sensor_reading",
        sensorData: {
          temperature: temperature,
          location: location,
          notes: matchingEvent?.notes || undefined
        },
        timestamp: new Date(timestamp * 1000).toISOString()
      });

      // Add to events array
      batch.events.push({
        logger: reporter,
        timestamp,
        eventData,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    } catch (error) {
      console.error(`Error fetching sensor data for batch ${tokenId}:`, error);

      // Fallback: add basic sensor data
      const eventData = JSON.stringify({
        type: "iot_sensor_reading",
        sensorData: {
          temperature: temperature,
          location: location
        },
        timestamp: new Date(timestamp * 1000).toISOString()
      });

      batch.events.push({
        logger: reporter,
        timestamp,
        eventData,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    }
  }

  /**
   * Get indexed batch by tokenId
   */
  getBatch(tokenId: number): IndexedBatch | undefined {
    return this.batches.get(tokenId);
  }

  /**
   * Get all indexed batches
   */
  getAllBatches(): IndexedBatch[] {
    return Array.from(this.batches.values());
  }

  /**
   * Get batches owned by address
   */
  getBatchesByOwner(owner: string): IndexedBatch[] {
    return Array.from(this.batches.values()).filter((batch) => batch.owner.toLowerCase() === owner.toLowerCase());
  }

  /**
   * Get batches manufactured by address (regardless of current owner)
   */
  getBatchesByManufacturer(manufacturer: string): IndexedBatch[] {
    return Array.from(this.batches.values()).filter((batch) => batch.manufacturer.toLowerCase() === manufacturer.toLowerCase());
  }

  /**
   * Get batches that have ever been owned by address (based on custody history)
   */
  getBatchesEverOwnedBy(address: string): IndexedBatch[] {
    const lowerAddress = address.toLowerCase();
    return Array.from(this.batches.values()).filter((batch) => {
      // Check if currently owned
      if (batch.owner.toLowerCase() === lowerAddress) {
        return true;
      }
      // Check if ever appeared in custody history
      return batch.custodyHistory.some(
        (record) => record.to.toLowerCase() === lowerAddress || record.from.toLowerCase() === lowerAddress
      );
    });
  }

  /**
   * Get batch events with pagination
   */
  getBatchEvents(tokenId: number, offset: number = 0, limit: number = 20): { events: Event[]; total: number } {
    const batch = this.batches.get(tokenId);
    if (!batch) {
      return { events: [], total: 0 };
    }

    const total = batch.events.length;
    const events = batch.events.slice(offset, offset + limit);

    return { events, total };
  }

  /**
   * Get custody history with pagination
   */
  getCustodyHistory(tokenId: number, offset: number = 0, limit: number = 20): { history: CustodyRecord[]; total: number } {
    const batch = this.batches.get(tokenId);
    if (!batch) {
      return { history: [], total: 0 };
    }

    const total = batch.custodyHistory.length;
    const history = batch.custodyHistory.slice(offset, offset + limit);

    return { history, total };
  }

  /**
   * Get indexer status
   */
  getStatus() {
    return {
      isIndexing: this.isIndexing,
      lastIndexedBlock: this.lastIndexedBlock,
      totalBatches: this.batches.size,
      totalEvents: Array.from(this.batches.values()).reduce((sum, batch) => sum + batch.events.length, 0),
      totalTransfers: Array.from(this.batches.values()).reduce((sum, batch) => sum + batch.custodyHistory.length, 0),
      sseClients: this.sseClients.size,
    };
  }

  /**
   * Add SSE client
   */
  addSSEClient(client: SSEClient): void {
    this.sseClients.add(client);
    console.log(`✅ SSE client connected: ${client.id} (Total: ${this.sseClients.size})`);
  }

  /**
   * Remove SSE client
   */
  removeSSEClient(client: SSEClient): void {
    this.sseClients.delete(client);
    console.log(`❌ SSE client disconnected: ${client.id} (Total: ${this.sseClients.size})`);
  }

  /**
   * Broadcast message to all connected SSE clients
   */
  private broadcastToClients(message: { type: string; data: any }): void {
    const payload = JSON.stringify(message);
    const deadClients: SSEClient[] = [];

    this.sseClients.forEach((client) => {
      try {
        client.res.write(`event: ${message.type}\n`);
        client.res.write(`data: ${payload}\n\n`);
      } catch (error) {
        console.error(`Failed to send to client ${client.id}:`, error);
        deadClients.push(client);
      }
    });

    // Remove dead clients
    deadClients.forEach((client) => this.removeSSEClient(client));

    console.log(`📢 Broadcasted ${message.type} to ${this.sseClients.size} clients`);
  }
}

// Singleton instance
let eventIndexer: EventIndexer | null = null;

/**
 * Get or create event indexer instance
 */
export function getEventIndexer(): EventIndexer {
  if (!eventIndexer) {
    eventIndexer = new EventIndexer();
  }
  return eventIndexer;
}

/**
 * Initialize event indexer
 */
export async function initializeEventIndexer(): Promise<void> {
  if (!indexerConfig.enabled) {
    console.log("Event indexer disabled in configuration");
    return;
  }

  const indexer = getEventIndexer();
  await indexer.start();
}

export default {
  EventIndexer,
  getEventIndexer,
  initializeEventIndexer,
};
