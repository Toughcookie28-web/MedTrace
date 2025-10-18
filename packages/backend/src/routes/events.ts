/**
 * @title SSE Events Route
 * @notice Real-time Server-Sent Events endpoint for blockchain events
 * @dev Streams BatchMinted, CustodyTransferred, and EventLogged events to connected clients
 */

import { Router, Request, Response } from "express";
import { getEventIndexer } from "../services/eventIndexer";
import { randomUUID } from "crypto";

const router = Router();

/**
 * SSE endpoint for real-time blockchain events
 * GET /api/events/stream
 *
 * Event types:
 * - BatchMinted: New batch created
 * - CustodyTransferred: Batch ownership changed
 * - EventLogged: Supply chain event logged
 */
router.get("/stream", (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Generate unique client ID
  const clientId = randomUUID();

  // Send initial connection message
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ clientId, message: "Connected to MedTrace events" })}\n\n`);

  // Register client with event indexer
  const eventIndexer = getEventIndexer();
  const client = { id: clientId, res };
  eventIndexer.addSSEClient(client);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    eventIndexer.removeSSEClient(client);
    res.end();
  });
});

export default router;
