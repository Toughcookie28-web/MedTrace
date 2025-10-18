/**
 * @title MedTrace Backend API Server
 * @notice Express server for the MedTrace blockchain supply chain tracking system
 * @dev Provides REST API endpoints for querying batch information, events, and stakeholder data
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import config, { serverConfig, validateConfig, printConfig } from "./config";
import { initializeContracts } from "./contracts";
import { initializeEventIndexer } from "./services/eventIndexer";
import apiRoutes from "./routes/api";
import eventsRoutes from "./routes/events";

/**
 * Express application instance
 */
const app = express();

// ==========================================
// Middleware Configuration
// ==========================================

/**
 * Security headers with Helmet
 */
app.use(helmet());

/**
 * CORS configuration
 */
app.use(
  cors({
    origin: [serverConfig.corsOrigin, 'http://localhost:5174', 'http://localhost:5173'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * JSON body parser
 */
app.use(express.json());

/**
 * URL-encoded body parser
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware (only in development)
 */
if (serverConfig.nodeEnv === "development") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// ==========================================
// API Routes
// ==========================================

/**
 * Health check root endpoint
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "MedTrace API",
    version: config.api.version,
    status: "running",
    timestamp: Date.now(),
  });
});

/**
 * SSE events routes (MUST be registered before API routes to avoid catch-all)
 */
app.use("/api/events", eventsRoutes);

/**
 * API routes
 */
app.use("/api", apiRoutes);

// ==========================================
// Error Handling Middleware
// ==========================================

/**
 * Global error handler
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);

  res.status(500).json({
    success: false,
    error: {
      message: serverConfig.nodeEnv === "development" ? err.message : "Internal server error",
      code: "SERVER_ERROR",
    },
    timestamp: Date.now(),
  });
});

// ==========================================
// Server Startup
// ==========================================

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    console.log("\n========================================");
    console.log("  MedTrace Backend API");
    console.log("========================================\n");

    // Validate configuration
    console.log("Step 1: Validating configuration...");
    validateConfig();
    console.log("✓ Configuration valid\n");

    // Print configuration
    printConfig();

    // Initialize contract connections
    console.log("Step 2: Initializing contract connections...");
    await initializeContracts();
    console.log();

    // Initialize event indexer
    console.log("Step 3: Starting event indexer...");
    await initializeEventIndexer();
    console.log();

    // Start Express server
    console.log("Step 4: Starting Express server...");
    const server = app.listen(serverConfig.port, serverConfig.host, () => {
      console.log("✓ Server started successfully\n");

      console.log("========================================");
      console.log("     SERVER RUNNING");
      console.log("========================================\n");

      console.log(`Server listening on: http://${serverConfig.host}:${serverConfig.port}`);
      console.log(`API Base URL:        http://${serverConfig.host}:${serverConfig.port}/api`);
      console.log(`Environment:         ${serverConfig.nodeEnv}`);
      console.log();

      console.log("Available Endpoints:");
      console.log(`  GET  /api/health                           - Health check`);
      console.log(`  GET  /api/batches                          - Get all batches (paginated)`);
      console.log(`  GET  /api/batches/:tokenId                 - Get batch details`);
      console.log(`  GET  /api/batches/:tokenId/events          - Get batch events (paginated)`);
      console.log(`  GET  /api/batches/:tokenId/custody         - Get custody history (paginated)`);
      console.log(`  GET  /api/stakeholders/:address/role       - Get stakeholder role`);
      console.log(`  GET  /api/stakeholders/:address/batches    - Get batches owned by address`);
      console.log(`  GET  /api/indexer/status                   - Get indexer status`);
      console.log(`  GET  /api/events/stream                    - Real-time SSE events stream 🔴 LIVE`);
      console.log();

      console.log("Press Ctrl+C to stop the server\n");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("\nReceived SIGTERM signal. Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed. Exiting process.");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("\nReceived SIGINT signal. Shutting down gracefully...");
      server.close(() => {
        console.log("Server closed. Exiting process.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("\n❌ Failed to start server:");
    console.error(error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
