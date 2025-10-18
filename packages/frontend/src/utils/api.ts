/**
 * @file API Client
 * @description HTTP client for communicating with the MedTrace backend API
 */

import { API_BASE_URL } from '../config';
import type {
  Batch,
  BatchEvent,
  CustodyRecord,
  PaginatedResponse,
  StakeholderRoleType,
} from '../types';

/**
 * Backend envelope types
 */
interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  pagination?: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  timestamp: number;
}

interface ApiErrorEnvelope {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: number;
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

interface BackendBatch {
  tokenId: number;
  manufacturer?: string;
  owner?: string;
  currentOwner?: string;
  tokenURI: string;
  mintedAt?: number;
  createdAt?: number;
}

interface BackendBatchEvent {
  logger: string;
  timestamp: number;
  eventData: string;
}

interface BackendCustodyRecord {
  from: string;
  to: string;
  timestamp: number;
}

/**
 * Fetch helper for plain JSON payloads (no envelope)
 */
async function apiRequestPlain<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, init);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch helper that expects the standard success envelope
 */
async function apiRequestEnvelope<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<ApiSuccessEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, init);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as ApiEnvelope<T>;

  if (!json || typeof json !== 'object' || !('success' in json)) {
    throw new Error('Unexpected API response format');
  }

  if (!json.success) {
    const message = json.error?.message || 'API request returned an error';
    throw new Error(message);
  }

  return json;
}

/**
 * Mapping helpers
 */
function mapBatch(batch: BackendBatch): Batch {
  return {
    tokenId: Number(batch.tokenId),
    manufacturer: batch.manufacturer ?? batch.owner ?? '',
    tokenURI: batch.tokenURI ?? '',
    currentOwner: batch.currentOwner ?? batch.owner ?? '',
    mintedAt: batch.mintedAt ?? batch.createdAt,
  };
}

function mapBatchEvent(event: BackendBatchEvent): BatchEvent {
  return {
    tokenId: 0, // Filled by calling context if needed
    logger: event.logger,
    timestamp: Number(event.timestamp),
    eventData: event.eventData,
  };
}

function mapCustodyRecord(record: BackendCustodyRecord): CustodyRecord {
  return {
    tokenId: 0, // Filled by calling context if needed
    from: record.from,
    to: record.to,
    timestamp: Number(record.timestamp),
  };
}

function mapPagination(
  pagination: ApiSuccessEnvelope<unknown>['pagination'] | undefined,
  limit: number,
): PaginatedResponse<unknown>['pagination'] {
  const safeLimit = limit > 0 ? limit : 10;
  const offset = pagination?.offset ?? 0;
  const total = pagination?.total ?? 0;
  const page = Math.floor(offset / safeLimit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    page,
    limit: safeLimit,
    total,
    totalPages,
  };
}

/**
 * API client for backend endpoints
 */
export const api = {
  /**
   * Health check (plain JSON, no envelope)
   */
  health: () => apiRequestPlain<{ status: string; timestamp: number }>('/api/health'),

  /**
   * Get all batches (paginated)
   */
  async getBatches(page = 1, limit = 10): Promise<PaginatedResponse<Batch>> {
    const offset = Math.max(0, page - 1) * limit;
    const envelope = await apiRequestEnvelope<BackendBatch[]>(
      `/api/batches?offset=${offset}&limit=${limit}`,
    );

    const data = (envelope.data || []).map(mapBatch);
    const pagination = mapPagination(envelope.pagination, limit);

    return { data, pagination };
  },

  /**
   * Get batch details by token ID
   */
  async getBatch(tokenId: number): Promise<Batch> {
    const envelope = await apiRequestEnvelope<BackendBatch | Record<string, unknown>>(
      `/api/batches/${tokenId}`,
    );

    const payload = envelope.data as BackendBatch;
    return mapBatch({
      tokenId: payload.tokenId ?? tokenId,
      manufacturer: payload.manufacturer,
      owner: payload.owner,
      currentOwner: payload.currentOwner,
      tokenURI: payload.tokenURI ?? '',
      mintedAt: payload.mintedAt,
      createdAt: payload.createdAt,
    });
  },

  /**
   * Get batch events (paginated)
   */
  async getBatchEvents(tokenId: number, page = 1, limit = 20): Promise<PaginatedResponse<BatchEvent>> {
    const offset = Math.max(0, page - 1) * limit;
    const envelope = await apiRequestEnvelope<BackendBatchEvent[]>(
      `/api/batches/${tokenId}/events?offset=${offset}&limit=${limit}`,
    );

    const data = (envelope.data || []).map((event) => ({
      ...mapBatchEvent(event),
      tokenId,
    }));

    const pagination = mapPagination(envelope.pagination, limit);

    return { data, pagination };
  },

  /**
   * Get custody history (paginated)
   */
  async getCustodyHistory(tokenId: number, page = 1, limit = 20): Promise<PaginatedResponse<CustodyRecord>> {
    const offset = Math.max(0, page - 1) * limit;
    const envelope = await apiRequestEnvelope<BackendCustodyRecord[]>(
      `/api/batches/${tokenId}/custody?offset=${offset}&limit=${limit}`,
    );

    const data = (envelope.data || []).map((record) => ({
      ...mapCustodyRecord(record),
      tokenId,
    }));

    const pagination = mapPagination(envelope.pagination, limit);

    return { data, pagination };
  },

  /**
   * Get stakeholder role by address
   */
  async getStakeholderRole(address: string) {
    const envelope = await apiRequestEnvelope<{ address: string; role: StakeholderRoleType; roleName: string }>(
      `/api/stakeholders/${address}/role`,
    );
    return envelope.data;
  },

  /**
   * Get batches owned by address
   */
  async getStakeholderBatches(address: string): Promise<{ address: string; batches: Batch[] }> {
    const envelope = await apiRequestEnvelope<BackendBatch[]>(
      `/api/stakeholders/${address}/batches`,
    );

    const batches = (envelope.data || []).map(mapBatch);
    return { address, batches };
  },

  /**
   * Get batches manufactured by address (regardless of current owner)
   */
  async getManufacturedBatches(address: string): Promise<{ address: string; batches: Batch[] }> {
    const envelope = await apiRequestEnvelope<BackendBatch[]>(
      `/api/stakeholders/${address}/manufactured`,
    );

    const batches = (envelope.data || []).map(mapBatch);
    return { address, batches };
  },

  /**
   * Get batches that have ever been owned by address (based on custody history)
   */
  async getBatchHistory(address: string): Promise<{ address: string; batches: Batch[] }> {
    const envelope = await apiRequestEnvelope<BackendBatch[]>(
      `/api/stakeholders/${address}/history`,
    );

    const batches = (envelope.data || []).map(mapBatch);
    return { address, batches };
  },

  /**
   * Get indexer status
   */
  async getIndexerStatus(): Promise<{
    listening: boolean;
    lastIndexedBlock: number;
    totalBatches: number;
    totalEvents: number;
    totalCustodyRecords: number;
  }> {
    const envelope = await apiRequestEnvelope<{
      isIndexing: boolean;
      lastIndexedBlock: number;
      totalBatches: number;
      totalEvents: number;
      totalTransfers: number;
    }>('/api/indexer/status');

    const data = envelope.data;
    return {
      listening: data.isIndexing,
      lastIndexedBlock: data.lastIndexedBlock,
      totalBatches: data.totalBatches,
      totalEvents: data.totalEvents,
      totalCustodyRecords: data.totalTransfers,
    };
  },
};
