/**
 * @file Real-time Events Hook
 * @description Custom React hook for subscribing to real-time blockchain events via SSE
 *
 * Connects to backend SSE stream and triggers callbacks when events occur
 */

import { useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';

const SSE_URL = `${API_BASE_URL}/api/events/stream`;

export type BlockchainEvent = {
  type: 'BatchMinted' | 'CustodyTransferred' | 'EventLogged' | 'ReceiptAcknowledged';
  data: {
    tokenId: number;
    [key: string]: any;
  };
};

export type EventHandler = (event: BlockchainEvent) => void;

interface UseRealtimeEventsOptions {
  /**
   * Callback for BatchMinted events
   */
  onBatchMinted?: (data: { tokenId: number; manufacturer: string; tokenURI: string }) => void;

  /**
   * Callback for CustodyTransferred events
   */
  onCustodyTransferred?: (data: { tokenId: number; from: string; to: string; timestamp: number }) => void;

  /**
   * Callback for EventLogged events
   */
  onEventLogged?: (data: { tokenId: number; logger: string; eventData: string; timestamp: number }) => void;

  /**
   * Callback for ReceiptAcknowledged events
   */
  onReceiptAcknowledged?: (data: { tokenId: number; acknowledger: string; receiptData: string; timestamp: number }) => void;

  /**
   * Callback for connection established
   */
  onConnected?: () => void;

  /**
   * Callback for connection errors
   */
  onError?: (error: Event) => void;

  /**
   * Enable/disable connection (default: true)
   */
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time blockchain events
 *
 * @example
 * useRealtimeEvents({
 *   onCustodyTransferred: ({ tokenId, from, to }) => {
 *     if (from === account) {
 *       // Batch transferred away
 *       loadBatches();
 *     } else if (to === account) {
 *       // Batch received
 *       loadBatches();
 *     }
 *   },
 * });
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions) {
  const {
    onBatchMinted,
    onCustodyTransferred,
    onEventLogged,
    onReceiptAcknowledged,
    onConnected,
    onError,
    enabled = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return;

    console.log('🔌 Connecting to SSE stream...');

    try {
      const eventSource = new EventSource(SSE_URL);
      eventSourceRef.current = eventSource;

      // Connection established
      eventSource.addEventListener('connected', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        console.log('✅ Connected to SSE stream:', data.clientId);
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      });

      // BatchMinted events
      eventSource.addEventListener('BatchMinted', (e: MessageEvent) => {
        const event: BlockchainEvent = JSON.parse(e.data);
        console.log('🔔 BatchMinted event received:', event.data);
        onBatchMinted?.(event.data as any);
      });

      // CustodyTransferred events
      eventSource.addEventListener('CustodyTransferred', (e: MessageEvent) => {
        const event: BlockchainEvent = JSON.parse(e.data);
        console.log('🔔 CustodyTransferred event received:', event.data);
        onCustodyTransferred?.(event.data as any);
      });

      // EventLogged events
      eventSource.addEventListener('EventLogged', (e: MessageEvent) => {
        const event: BlockchainEvent = JSON.parse(e.data);
        console.log('🔔 EventLogged event received:', event.data);
        onEventLogged?.(event.data as any);
      });

      // ReceiptAcknowledged events
      eventSource.addEventListener('ReceiptAcknowledged', (e: MessageEvent) => {
        const event: BlockchainEvent = JSON.parse(e.data);
        console.log('🔔 ReceiptAcknowledged event received:', event.data);
        onReceiptAcknowledged?.(event.data as any);
      });

      // Error handling
      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        onError?.(error);

        // Attempt reconnection with exponential backoff
        eventSource.close();
        eventSourceRef.current = null;

        const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        console.log(`🔄 Reconnecting in ${backoffDelay / 1000}s (attempt ${reconnectAttemptsRef.current})...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffDelay);
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
    }
  }, [enabled, onBatchMinted, onCustodyTransferred, onEventLogged, onReceiptAcknowledged, onConnected, onError]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from SSE stream...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { disconnect, reconnect: connect };
}
