/**
 * @file Pharmacist Dashboard Component
 * @description Dashboard for pharmacists with Incoming Shipments, Current Inventory, and Log Event tabs
 */

import { useState, useEffect, FormEvent } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { api } from '../../utils/api';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import { parseTokenURI } from '../../utils/batchUtils';
import { QRScannerModal } from '../common/QRScannerModal';
import { QRCodeGenerator } from '../common/QRCodeGenerator';
import { IoTSensorLogModal } from '../common/IoTSensorLogModal';
import { PartnershipVouchModal } from '../common/PartnershipVouchModal';
import type { Batch } from '../../types';

type Tab = 'incoming' | 'current' | 'logEvent';

export function PharmacistDashboard() {
  const { trackAndTrace, account } = useWeb3();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('incoming');

  // Batches state
  const [incomingBatches, setIncomingBatches] = useState<Batch[]>([]);
  const [currentBatches, setCurrentBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Scanner & IoT Modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [iotModalOpen, setIotModalOpen] = useState(false);
  const [iotLogTokenId, setIotLogTokenId] = useState<number | null>(null);
  const [isAcknowledgmentMode, setIsAcknowledgmentMode] = useState(false);
  const [scannedTokenForAcknowledge, setScannedTokenForAcknowledge] = useState<{
    tokenId: number;
    productName: string;
    batchNumber: string;
  } | null>(null);

  // Acknowledgment feedback state
  const [acknowledgmentSuccess, setAcknowledgmentSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessInfo, setScanSuccessInfo] = useState<{
    tokenId: number;
    productName: string;
    batchNumber: string;
  } | null>(null);

  // Manual QR link input state
  const [manualQRInputs, setManualQRInputs] = useState<Record<number, string>>({});

  // Log Event state
  const [eventBatchId, setEventBatchId] = useState<number | null>(null);
  const [eventData, setEventData] = useState('');
  const [isLoggingEvent, setIsLoggingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState(false);

  // IoT logging state (for Current Inventory tab - removed duplicate below)

  // New features modals state
  const [partnershipModalOpen, setPartnershipModalOpen] = useState(false);

  // Load pharmacist's batches and categorize them
  const loadBatches = async () => {
    if (!account || !trackAndTrace) return;

    try {
      setIsLoadingBatches(true);
      setLoadError(null);

      const response = await api.getStakeholderBatches(account);
      const batches = response.batches;

      // Categorize batches into incoming (unacknowledged) and current (acknowledged)
      const incoming: Batch[] = [];
      const current: Batch[] = [];

      for (const batch of batches) {
        try {
          const isAcknowledged = await trackAndTrace.isReceiptAcknowledged(batch.tokenId, account);
          console.log(`📦 Batch #${batch.tokenId} - Acknowledged by me: ${isAcknowledged}`);
          if (isAcknowledged) {
            current.push(batch);
          } else {
            incoming.push(batch);
          }
        } catch (error) {
          console.error(`Error checking acknowledgement for batch ${batch.tokenId}:`, error);
          // Default to incoming if we can't check
          incoming.push(batch);
        }
      }

      console.log(`📥 Incoming batches: ${incoming.length}`, incoming.map(b => b.tokenId));
      console.log(`📦 Current batches: ${current.length}`, current.map(b => b.tokenId));

      setIncomingBatches(incoming);
      setCurrentBatches(current);
    } catch (error) {
      console.error('Failed to load batches:', error);
      const message = error instanceof Error ? error.message : 'Failed to load batches';

      // Check if it's a "no data" type error
      const isNoDataError =
        message.toLowerCase().includes('no batches') ||
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('no data');

      if (isNoDataError) {
        // It's expected - just show empty state
        setIncomingBatches([]);
        setCurrentBatches([]);
        setLoadError(null);
      } else {
        // It's a real error - show it
        setIncomingBatches([]);
        setCurrentBatches([]);
        setLoadError(message);
      }
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [account, trackAndTrace]);

  // Real-time events subscription
  useRealtimeEvents({
    onCustodyTransferred: ({ to }) => {
      // Reload if batch transferred to this account
      if (account && to.toLowerCase() === account.toLowerCase()) {
        console.log(`🎉 New batch received!`);
        loadBatches();
      }
    },
    onReceiptAcknowledged: ({ acknowledger }) => {
      // Reload if this account acknowledged a receipt
      if (account && acknowledger.toLowerCase() === account.toLowerCase()) {
        console.log(`✅ Receipt acknowledged by me`);
        loadBatches();
      }
    },
    onEventLogged: ({ logger }) => {
      // Reload if this account logged an event
      if (account && logger.toLowerCase() === account.toLowerCase()) {
        console.log(`📝 Event logged by me`);
      }
    },
    onConnected: () => {
      console.log('🟢 Real-time events connected');
    },
  });

  // Handle scan QR for acknowledgement
  const handleOpenScanner = (tokenId: number) => {
    const batch = incomingBatches.find((b) => b.tokenId === tokenId);
    if (batch) {
      const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
      console.log(`📸 Opening scanner for Token #${tokenId}: ${productName} (${batchNumber})`);
      setScannedTokenForAcknowledge({ tokenId, productName, batchNumber });
      setScanError(null);
      setScannerOpen(true);
    }
  };

  const handleScanSuccess = (scannedTokenId: number) => {
    console.log(`✅ QR Scan successful! Scanned Token ID: ${scannedTokenId}`);
    setScannerOpen(false);

    if (scannedTokenForAcknowledge && scannedTokenId === scannedTokenForAcknowledge.tokenId) {
      console.log(`✓ Token ID matches! Opening IoT modal for acknowledgment...`);
      setScanError(null);

      // Show scan success info
      setScanSuccessInfo({
        tokenId: scannedTokenId,
        productName: scannedTokenForAcknowledge.productName,
        batchNumber: scannedTokenForAcknowledge.batchNumber,
      });

      setIotLogTokenId(scannedTokenId);
      setIsAcknowledgmentMode(true);
      setIotModalOpen(true);
    } else {
      const errorMsg = scannedTokenForAcknowledge
        ? `❌ Wrong batch scanned! Expected Token #${scannedTokenForAcknowledge.tokenId} but scanned #${scannedTokenId}`
        : `❌ Unexpected scan result`;
      console.error(errorMsg);
      setScanError(errorMsg);
      setScannedTokenForAcknowledge(null);
    }
  };

  const handleManualQRSubmit = (tokenId: number) => {
    const qrLink = manualQRInputs[tokenId];
    if (!qrLink || !qrLink.trim()) {
      setScanError('Please enter a QR code link');
      return;
    }

    try {
      // Extract tokenId from verification URL
      // Expected format: http://localhost:5174/verify?tokenId=X
      const url = new URL(qrLink.trim());
      const tokenIdParam = url.searchParams.get('tokenId');

      if (!tokenIdParam) {
        setScanError('Invalid QR link: No tokenId found in URL');
        return;
      }

      const scannedTokenId = parseInt(tokenIdParam, 10);

      if (isNaN(scannedTokenId)) {
        setScanError('Invalid QR link: tokenId is not a number');
        return;
      }

      // Verify it matches the expected batch
      if (scannedTokenId !== tokenId) {
        setScanError(`❌ Wrong batch! Expected Token #${tokenId} but got #${scannedTokenId}`);
        return;
      }

      // Success - same flow as QR scan
      console.log(`✅ Manual QR link validated! Token ID: ${scannedTokenId}`);
      const batch = incomingBatches.find(b => b.tokenId === tokenId);
      if (batch) {
        const { productName, batchNumber } = parseTokenURI(batch.tokenURI);

        setScanError(null);
        setScanSuccessInfo({
          tokenId: scannedTokenId,
          productName,
          batchNumber,
        });

        // Clear the input
        setManualQRInputs(prev => ({ ...prev, [tokenId]: '' }));

        // Open IoT modal in acknowledgment mode
        setIotLogTokenId(scannedTokenId);
        setIsAcknowledgmentMode(true);
        setIotModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to parse manual QR link:', err);
      setScanError('Invalid QR link format. Expected format: http://localhost:5174/verify?tokenId=X');
    }
  };

  const handleIoTSuccess = async () => {
    console.log('✅ IoT data logged successfully!');

    // If this was for acknowledgment, also call acknowledgeReceipt
    if (isAcknowledgmentMode && iotLogTokenId && trackAndTrace) {
      try {
        console.log(`📝 Marking Token #${iotLogTokenId} as acknowledged...`);

        const receiptData = JSON.stringify({
          type: 'receipt_acknowledgement',
          tokenId: iotLogTokenId,
          timestamp: new Date().toISOString(),
          acknowledgedBy: account,
        });

        const tx = await trackAndTrace.acknowledgeReceipt(iotLogTokenId, receiptData);
        console.log(`⏳ Waiting for transaction confirmation...`);
        await tx.wait();

        console.log('✅ Receipt acknowledged on-chain!');

        setAcknowledgmentSuccess(true);
        setTimeout(() => {
          setAcknowledgmentSuccess(false);
        }, 5000);

        // Add delay to ensure blockchain state is updated and backend has indexed
        console.log('⏳ Waiting for blockchain state to update and backend to index...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error: any) {
        console.error('❌ Failed to acknowledge receipt:', error);

        // Show error to user
        const errorMessage = error.message || 'Failed to acknowledge receipt';
        setScanError(`⚠️ Acknowledgment failed: ${errorMessage}`);

        // Reset states and close modal
        setIotModalOpen(false);
        setIotLogTokenId(null);
        setIsAcknowledgmentMode(false);
        setScannedTokenForAcknowledge(null);
        setScanSuccessInfo(null);

        // Still reload batches
        await loadBatches();
        return; // Exit early - don't show success message
      }
    }

    // Reset states
    setIotModalOpen(false);
    setIotLogTokenId(null);
    setIsAcknowledgmentMode(false);
    setScannedTokenForAcknowledge(null);
    setScanSuccessInfo(null); // Clear scan success notification

    // Reload batches
    console.log('🔄 Reloading batches after acknowledgment...');
    await loadBatches();
    console.log('✅ Batches reloaded!');
  };

  // Handle event logging
  const handleLogEvent = async (e: FormEvent) => {
    e.preventDefault();

    if (!trackAndTrace || eventBatchId === null) {
      setEventError('Contract not initialized or no batch selected');
      return;
    }

    if (!eventData.trim()) {
      setEventError('Event data is required');
      return;
    }

    try {
      setIsLoggingEvent(true);
      setEventError(null);
      setEventSuccess(false);

      console.log('Logging event for batch', eventBatchId, ':', eventData);
      const tx = await trackAndTrace.logEvent(eventBatchId, eventData);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      setEventSuccess(true);
      setEventData('');

      console.log('✅ Event logged successfully!');
    } catch (error: any) {
      console.error('Failed to log event:', error);
      setEventError(error.message || 'Failed to log event');
    } finally {
      setIsLoggingEvent(false);
    }
  };

  return (
    <div>
      {/* Action Buttons Bar */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setPartnershipModalOpen(true)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          🤝 Vouch for Partner
        </button>
      </div>

      {/* Success Notification */}
      {acknowledgmentSuccess && (
        <div
          style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #28a745',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <strong>Receipt Acknowledged!</strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'normal' }}>
              The batch has been moved to your Current Inventory.
            </p>
          </div>
        </div>
      )}

      {/* Scan Error Notification */}
      {scanError && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #dc3545',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>❌</span>
            <span>{scanError}</span>
          </div>
          <button
            onClick={() => setScanError(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#721c24',
              padding: '0',
              lineHeight: '1',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('incoming')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'incoming' ? '#007bff' : 'transparent',
            color: activeTab === 'incoming' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'incoming' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          📥 Incoming Shipments ({incomingBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('current')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'current' ? '#007bff' : 'transparent',
            color: activeTab === 'current' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'current' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          📦 Current Inventory ({currentBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('logEvent')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'logEvent' ? '#007bff' : 'transparent',
            color: activeTab === 'logEvent' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'logEvent' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
          }}
        >
          📝 Log Event
        </button>
      </div>

      {/* Error Display */}
      {loadError && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          {loadError}
        </div>
      )}

      {/* Incoming Shipments Tab */}
      {activeTab === 'incoming' && (
        <div
          style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ marginTop: 0 }}>📥 Incoming Shipments</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            These batches have been transferred to you but not yet acknowledged. Scan the QR code on the physical package to confirm receipt and log storage conditions.
          </p>

          {isLoadingBatches ? (
            <p>Loading batches...</p>
          ) : incomingBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No incoming shipments</p>
              <p style={{ fontSize: '14px' }}>
                Batches will appear here when transferred to your address
              </p>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                marginTop: '20px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '10%' }}>Token ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Product Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '20%' }}>Batch Number</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '20%' }}>Manufacturer</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '25%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingBatches.map((batch) => {
                  const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                  return (
                    <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>#{batch.tokenId}</td>
                      <td style={{ padding: '12px' }}>{productName}</td>
                      <td style={{ padding: '12px' }}>{batchNumber}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                        {batch.manufacturer.substring(0, 10)}...
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenScanner(batch.tokenId)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              width: '100%',
                            }}
                          >
                            📸 Scan & Acknowledge
                          </button>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Or paste QR link..."
                              value={manualQRInputs[batch.tokenId] || ''}
                              onChange={(e) => setManualQRInputs(prev => ({ ...prev, [batch.tokenId]: e.target.value }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleManualQRSubmit(batch.tokenId);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: '12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                              }}
                            />
                            <button
                              onClick={() => handleManualQRSubmit(batch.tokenId)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Current Inventory Tab */}
      {activeTab === 'current' && (
        <div
          style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ marginTop: 0 }}>📦 Current Inventory</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            These are batches you have acknowledged and are currently in your inventory.
          </p>

          {isLoadingBatches ? (
            <p>Loading batches...</p>
          ) : currentBatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No batches in current inventory</p>
              <p style={{ fontSize: '14px' }}>
                Batches will appear here after you acknowledge incoming shipments
              </p>
            </div>
          ) : (
            <div>
              {currentBatches.map((batch) => {
                const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                return (
                  <div
                    key={batch.tokenId}
                    style={{
                      padding: '20px',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ marginTop: 0 }}>Batch #{batch.tokenId}</h3>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Product:</strong> {productName}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Batch Number:</strong> {batchNumber}
                        </p>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                          <strong>Manufacturer:</strong> {batch.manufacturer.substring(0, 10)}...
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <QRCodeGenerator
                          tokenId={batch.tokenId}
                          size={100}
                          productName={productName}
                          batchNumber={batchNumber}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => {
                              setIotLogTokenId(batch.tokenId);
                              setIsAcknowledgmentMode(false);
                              setIotModalOpen(true);
                            }}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '14px',
                              cursor: 'pointer',
                            }}
                          >
                            📡 Log IoT Data
                          </button>
                          <a
                            href={`/verify?tokenId=${batch.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          >
                            View Details
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log Event Tab */}
      {activeTab === 'logEvent' && (
        <div
          style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ marginTop: 0 }}>📝 Log Supply Chain Event</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Record events such as dispensing to patients, storage conditions, or quality checks for batches in your current inventory.
          </p>

          <form onSubmit={handleLogEvent}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Select Batch:
              </label>
              <select
                value={eventBatchId ?? ''}
                onChange={(e) => setEventBatchId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                disabled={isLoggingEvent}
              >
                <option value="">-- Select a batch from current inventory --</option>
                {currentBatches.map((batch) => {
                  const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                  return (
                    <option key={batch.tokenId} value={batch.tokenId}>
                      Batch #{batch.tokenId} - {productName} ({batchNumber})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Event Data:
              </label>
              <textarea
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                placeholder="E.g., Dispensed to patient, Storage: 20-25°C, Quality check passed"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                }}
                disabled={isLoggingEvent}
              />
              <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Enter details about storage conditions, dispensing, or quality checks
              </p>
            </div>

            {eventError && (
              <div
                style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                }}
              >
                {eventError}
              </div>
            )}

            {eventSuccess && (
              <div
                style={{
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                }}
              >
                ✓ Event logged successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingEvent || eventBatchId === null}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: isLoggingEvent ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoggingEvent || eventBatchId === null ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoggingEvent ? 'Logging...' : 'Log Event'}
            </button>
          </form>
        </div>
      )}

      {/* QR Scanner Modal */}
      {scannedTokenForAcknowledge && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => {
            setScannerOpen(false);
            setScannedTokenForAcknowledge(null);
          }}
          onScan={handleScanSuccess}
          expectedTokenId={scannedTokenForAcknowledge.tokenId}
        />
      )}

      {/* IoT Sensor Log Modal (used for both acknowledgment and regular logging) */}
      {iotLogTokenId !== null && (
        <IoTSensorLogModal
          isOpen={iotModalOpen}
          onClose={() => {
            setIotModalOpen(false);
            setIotLogTokenId(null);
            setIsAcknowledgmentMode(false);
            setScannedTokenForAcknowledge(null);
            setScanSuccessInfo(null); // Clear scan success notification on close
          }}
          tokenId={iotLogTokenId}
          onSuccess={handleIoTSuccess}
          scanSuccessInfo={scanSuccessInfo ? { productName: scanSuccessInfo.productName, batchNumber: scanSuccessInfo.batchNumber } : null}
        />
      )}

      {/* Partnership Vouch Modal */}
      <PartnershipVouchModal
        isOpen={partnershipModalOpen}
        onClose={() => setPartnershipModalOpen(false)}
        onSuccess={() => {
          console.log('Partnership vouched successfully');
        }}
      />
    </div>
  );
}
