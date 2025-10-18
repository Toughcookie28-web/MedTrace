/**
 * @title MedTrace API Routes
 * @notice REST API endpoints for the MedTrace backend
 * @dev Provides endpoints for batch queries, event retrieval, and stakeholder information
 */

import { Router, Request, Response } from "express";
import { getContractManager } from "../contracts";
import { getEventIndexer } from "../services/eventIndexer";
import { apiConfig } from "../config";
import { ApiResponse, ApiError, PaginatedResponse, StakeholderRole, RoleNames, HealthCheckResponse } from "../types";

const router = Router();

/**
 * Helper function to create success response
 */
function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Helper function to create paginated response
 */
function paginatedResponse<T>(data: T[], total: number, offset: number, limit: number): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + data.length < total,
    },
    timestamp: Date.now(),
  };
}

/**
 * Helper function to create error response
 */
function errorResponse(message: string, code?: string, details?: any): ApiError {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    timestamp: Date.now(),
  };
}

/**
 * Helper function to validate and parse pagination parameters
 */
function parsePagination(req: Request): { offset: number; limit: number } {
  const offset = parseInt(req.query.offset as string) || 0;
  let limit = parseInt(req.query.limit as string) || apiConfig.defaultPageSize;

  // Ensure offset is non-negative
  if (offset < 0) {
    throw new Error("Offset must be non-negative");
  }

  // Ensure limit is within bounds
  if (limit < 1) {
    limit = apiConfig.defaultPageSize;
  }
  if (limit > apiConfig.maxPageSize) {
    limit = apiConfig.maxPageSize;
  }

  return { offset, limit };
}

// ==========================================
// Health Check Endpoint
// ==========================================

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const contractManager = getContractManager();
    const networkInfo = await contractManager.getNetworkInfo();
    const verification = await contractManager.verifyContracts();
    const addresses = contractManager.getContractAddresses();

    const response: HealthCheckResponse = {
      status: verification.stakeholderRegistry && verification.digitalBatch && verification.trackAndTrace ? "healthy" : "unhealthy",
      version: apiConfig.version,
      network: {
        name: networkInfo.name,
        chainId: networkInfo.chainId,
        connected: networkInfo.connected,
      },
      contracts: {
        stakeholderRegistry: {
          address: addresses.stakeholderRegistry,
          deployed: verification.stakeholderRegistry,
        },
        digitalBatch: {
          address: addresses.digitalBatch,
          deployed: verification.digitalBatch,
        },
        trackAndTrace: {
          address: addresses.trackAndTrace,
          deployed: verification.trackAndTrace,
        },
      },
      timestamp: Date.now(),
    };

    return res.json(response);
  } catch (error: any) {
    return res.status(500).json(errorResponse("Health check failed", "HEALTH_CHECK_ERROR", error.message));
  }
});

// ==========================================
// Batch Endpoints
// ==========================================

/**
 * GET /api/batches/:tokenId
 * Get batch details by tokenId
 */
router.get("/batches/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId) || tokenId < 1) {
      return res.status(400).json(errorResponse("Invalid tokenId", "INVALID_TOKEN_ID"));
    }

    const indexer = getEventIndexer();
    const batch = indexer.getBatch(tokenId);

    if (!batch) {
      // Try to fetch from contract if not indexed
      const contractManager = getContractManager();
      const digitalBatch = contractManager.getDigitalBatch();

      try {
        const owner = await digitalBatch.ownerOf(tokenId);
        const tokenURI = await digitalBatch.tokenURI(tokenId);

        return res.json(
          successResponse({
            tokenId,
            owner,
            tokenURI,
            note: "Batch not fully indexed. Use indexer for complete history.",
          })
        );
      } catch {
        return res.status(404).json(errorResponse("Batch not found", "BATCH_NOT_FOUND"));
      }
    }

    return res.json(successResponse(batch));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch batch", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/batches/:tokenId/events
 * Get batch event history with pagination
 */
router.get("/batches/:tokenId/events", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId) || tokenId < 1) {
      return res.status(400).json(errorResponse("Invalid tokenId", "INVALID_TOKEN_ID"));
    }

    const { offset, limit } = parsePagination(req);

    const indexer = getEventIndexer();
    const { events, total } = indexer.getBatchEvents(tokenId, offset, limit);

    return res.json(paginatedResponse(events, total, offset, limit));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch events", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/batches/:tokenId/custody
 * Get custody chain history with pagination
 */
router.get("/batches/:tokenId/custody", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId) || tokenId < 1) {
      return res.status(400).json(errorResponse("Invalid tokenId", "INVALID_TOKEN_ID"));
    }

    const { offset, limit } = parsePagination(req);

    const indexer = getEventIndexer();
    const { history, total } = indexer.getCustodyHistory(tokenId, offset, limit);

    return res.json(paginatedResponse(history, total, offset, limit));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch custody history", "FETCH_ERROR", error.message));
  }
});

// ==========================================
// Stakeholder Endpoints
// ==========================================

/**
 * GET /api/stakeholders/:address/role
 * Get stakeholder role by address
 */
router.get("/stakeholders/:address/role", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;

    // Basic address validation
    if (!address || address.length !== 42 || !address.startsWith("0x")) {
      return res.status(400).json(errorResponse("Invalid address format", "INVALID_ADDRESS"));
    }

    const contractManager = getContractManager();
    const stakeholderRegistry = contractManager.getStakeholderRegistry();

    const role = await stakeholderRegistry.getRole(address);
    const roleNumber = Number(role) as StakeholderRole;
    const roleName = RoleNames[roleNumber];

    return res.json(
      successResponse({
        address,
        role: roleNumber,
        roleName,
      })
    );
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch stakeholder role", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/stakeholders/:address/batches
 * Get batches owned by address
 */
router.get("/stakeholders/:address/batches", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;

    // Basic address validation
    if (!address || address.length !== 42 || !address.startsWith("0x")) {
      return res.status(400).json(errorResponse("Invalid address format", "INVALID_ADDRESS"));
    }

    const indexer = getEventIndexer();
    const batches = indexer.getBatchesByOwner(address);

    return res.json(successResponse(batches));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch stakeholder batches", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/stakeholders/:address/manufactured
 * Get batches manufactured by address (regardless of current owner)
 */
router.get("/stakeholders/:address/manufactured", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;

    // Basic address validation
    if (!address || address.length !== 42 || !address.startsWith("0x")) {
      return res.status(400).json(errorResponse("Invalid address format", "INVALID_ADDRESS"));
    }

    const indexer = getEventIndexer();
    const batches = indexer.getBatchesByManufacturer(address);

    return res.json(successResponse(batches));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch manufactured batches", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/stakeholders/:address/history
 * Get batches that have ever been owned by address (based on custody history)
 */
router.get("/stakeholders/:address/history", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;

    // Basic address validation
    if (!address || address.length !== 42 || !address.startsWith("0x")) {
      return res.status(400).json(errorResponse("Invalid address format", "INVALID_ADDRESS"));
    }

    const indexer = getEventIndexer();
    const batches = indexer.getBatchesEverOwnedBy(address);

    return res.json(successResponse(batches));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch batch history", "FETCH_ERROR", error.message));
  }
});

// ==========================================
// System Endpoints
// ==========================================

/**
 * GET /api/indexer/status
 * Get event indexer status
 */
router.get("/indexer/status", async (_req: Request, res: Response) => {
  try {
    const indexer = getEventIndexer();
    const status = indexer.getStatus();

    return res.json(successResponse(status));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch indexer status", "FETCH_ERROR", error.message));
  }
});

/**
 * GET /api/batches
 * Get all batches (paginated)
 */
router.get("/batches", async (req: Request, res: Response) => {
  try {
    const { offset, limit } = parsePagination(req);

    const indexer = getEventIndexer();
    const allBatches = indexer.getAllBatches();

    const total = allBatches.length;
    const batches = allBatches.slice(offset, offset + limit);

    return res.json(paginatedResponse(batches, total, offset, limit));
  } catch (error: any) {
    return res.status(500).json(errorResponse("Failed to fetch batches", "FETCH_ERROR", error.message));
  }
});

// ==========================================
// Error Handler
// ==========================================

/**
 * 404 handler
 */
router.use((_req: Request, res: Response) => {
  return res.status(404).json(errorResponse("Endpoint not found", "NOT_FOUND"));
});

export default router;
