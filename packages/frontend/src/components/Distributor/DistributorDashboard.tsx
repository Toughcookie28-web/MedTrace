/**
 * @file Distributor Dashboard Component
 * @description Dashboard with 3 tabs: Incoming Shipments, Current Inventory, Shipment History
 */

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { api } from '../../utils/api';
import { parseTokenURI, formatBatchName } from '../../utils/batchUtils';
import { QRScannerModal } from '../common/QRScannerModal';
import { QRCodeGenerator } from '../common/QRCodeGenerator';
import { IoTSensorLogModal } from '../common/IoTSensorLogModal';
import { PartnershipVouchModal } from '../common/PartnershipVouchModal';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import type { Batch } from '../../types';

type TabType = 'incoming' | 'current' | 'history';

export function DistributorDashboard() {
  const { trackAndTrace, digitalBatch, account, contracts } = useWeb3();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('incoming');

  // Batches state
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [incomingBatches, setIncomingBatches] = useState<Batch[]>([]);
  const [currentBatches, setCurrentBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acknowledgementStatus, setAcknowledgementStatus] = useState<Record<number, boolean>>({});

  // QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedTokenForAcknowledge, setScannedTokenForAcknowledge] = useState<{
    tokenId: number;
    productName: string;
    batchNumber: string;
  } | null>(null);

  // IoT modal state (used for both acknowledgment and regular logging)
  const [iotModalOpen, setIotModalOpen] = useState(false);
  const [iotLogTokenId, setIotLogTokenId] = useState<number | null>(null);
  const [isAcknowledgmentMode, setIsAcknowledgmentMode] = useState(false); // Track if this is for acknowledgment

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

  // Transfer state
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Vouched partners state
  const [vouchedPartners, setVouchedPartners] = useState<Array<{ address: string; role: number }>>([]);

  // New features modals state
  const [partnershipModalOpen, setPartnershipModalOpen] = useState(false);

  // Load vouched partners
  const loadVouchedPartners = async () => {
    if (!account || !contracts.partnershipRegistry || !contracts.stakeholderRegistry) return;

    try {
      const partnerAddresses = await contracts.partnershipRegistry.getVouchedPartners(account);
      const partnersWithRoles = await Promise.all(
        partnerAddresses.map(async (address: string) => {
          const role = await contracts.stakeholderRegistry.getRole(address);
          return { address, role: Number(role) };
        })
      );
      setVouchedPartners(partnersWithRoles);
    } catch (error) {
      console.error('Failed to load vouched partners:', error);
    }
  };

  // Load distributor's batches and categorize them
  const loadBatches = async () => {
    if (!account || !trackAndTrace) return;

    try {
      setIsLoadingBatches(true);
      setLoadError(null);
      const response = await api.getStakeholderBatches(account);
      const batches = response.batches;
      setAllBatches(batches);

      // Check acknowledgement status for each batch
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
        } catch (err) {
          console.error(`Error checking acknowledgement for batch ${batch.tokenId}:`, err);
          // If error, assume incoming
          incoming.push(batch);
        }
      }

      console.log(`📥 Incoming batches: ${incoming.length}`, incoming.map(b => b.tokenId));
      console.log(`📦 Current batches: ${current.length}`, current.map(b => b.tokenId));

      setIncomingBatches(incoming);
      setCurrentBatches(current);

      // Load history batches (all batches ever owned)
      try {
        const historyResponse = await api.getBatchHistory(account);
        const allHistoryBatches = historyResponse.batches;

        // Check acknowledgement status for history batches
        const statusMap: Record<number, boolean> = {};
        for (const batch of allHistoryBatches) {
          try {
            const isAcknowledged = await trackAndTrace.isReceiptAcknowledged(
              batch.tokenId,
              batch.currentOwner
            );
            statusMap[batch.tokenId] = isAcknowledged;
          } catch (error) {
            console.error(`Error checking acknowledgement for batch ${batch.tokenId}:`, error);
            statusMap[batch.tokenId] = false;
          }
        }
        setAcknowledgementStatus(statusMap);
        setHistoryBatches(allHistoryBatches);
      } catch (error) {
        console.error('Failed to load history:', error);
        setHistoryBatches([]);
      }

    } catch (error) {
      console.error('Failed to load batches:', error);
      const message = error instanceof Error ? error.message : 'Failed to load batches';

      const isNoDataError = message.toLowerCase().includes('no batches') ||
                           message.toLowerCase().includes('not found') ||
                           message.toLowerCase().includes('no data');

      if (isNoDataError) {
        setAllBatches([]);
        setIncomingBatches([]);
        setCurrentBatches([]);
        setHistoryBatches([]);
        setLoadError(null);
      } else {
        setLoadError(message);
      }
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
    loadVouchedPartners();
  }, [account, contracts]);

  // Real-time events subscription
  useRealtimeEvents({
    onCustodyTransferred: ({ from, to }) => {
      if (account && (from.toLowerCase() === account.toLowerCase() || to.toLowerCase() === account.toLowerCase())) {
        console.log(`🔄 Custody changed involving my account`);
        loadBatches();
      }
    },
    onReceiptAcknowledged: ({ acknowledger }) => {
      if (account && acknowledger.toLowerCase() === account.toLowerCase()) {
        console.log(`✅ Receipt acknowledged by me`);
        loadBatches();
      }
    },
    onConnected: () => {
      console.log('🟢 Real-time events connected');
    },
  });

  // Handle scan QR for acknowledgement
  const handleOpenScanner = (tokenId: number) => {
    const batch = incomingBatches.find(b => b.tokenId === tokenId);
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

    // Close scanner
    setScannerOpen(false);

    // Verify match
    if (scannedTokenForAcknowledge && scannedTokenId === scannedTokenForAcknowledge.tokenId) {
      console.log(`✓ Token ID matches! Opening IoT modal for acknowledgment...`);
      setScanError(null);

      // Show scan success info
      setScanSuccessInfo({
        tokenId: scannedTokenId,
        productName: scannedTokenForAcknowledge.productName,
        batchNumber: scannedTokenForAcknowledge.batchNumber,
      });

      // Open IoT modal in acknowledgment mode
      setIotLogTokenId(scannedTokenId);
      setIsAcknowledgmentMode(true);
      setIotModalOpen(true);
    } else {
      // Token ID mismatch or no expected token
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

        // Create receipt data JSON
        const receiptData = JSON.stringify({
          type: 'receipt_acknowledgement',
          tokenId: iotLogTokenId,
          timestamp: new Date().toISOString(),
          acknowledgedBy: account,
        });

        // Call acknowledgeReceipt
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

  // Handle custody transfer
  const handleTransferCustody = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackAndTrace || !digitalBatch || selectedBatch === null) {
      setTransferError('Contract not initialized or no batch selected');
      return;
    }

    if (!transferTo.trim()) {
      setTransferError('Recipient address is required');
      return;
    }

    // Validate Ethereum address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(transferTo.trim())) {
      setTransferError('Invalid Ethereum address format. Must be a 42-character hex string starting with 0x');
      return;
    }

    try {
      setIsTransferring(true);
      setTransferError(null);
      setTransferSuccess(false);

      // Use trimmed address to avoid ENS lookup
      const recipientAddress = transferTo.trim();

      // Transaction 1: Approve TrackAndTrace to manage the token
      const trackAndTraceAddress = await trackAndTrace.getAddress();
      console.log('Approving TrackAndTrace contract...');
      const approveTx = await digitalBatch.approve(trackAndTraceAddress, selectedBatch);
      await approveTx.wait();
      console.log('✓ Approved');

      // Transaction 2: Transfer custody
      console.log('Transferring custody...');
      const tx = await trackAndTrace.transferCustody(selectedBatch, recipientAddress);
      await tx.wait();
      console.log('✓ Transfer complete');

      setTransferSuccess(true);
      setTransferTo('');
      setSelectedBatch(null);

      // Real-time event will trigger automatic refresh
    } catch (error: any) {
      console.error('Failed to transfer custody:', error);
      setTransferError(error.message || 'Failed to transfer custody');
    } finally {
      setIsTransferring(false);
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
      <div style={{ display: 'flex', borderBottom: '2px solid #dee2e6', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('incoming')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'incoming' ? '#007bff' : 'transparent',
            color: activeTab === 'incoming' ? 'white' : '#007bff',
            fontWeight: 'bold',
            borderBottom: activeTab === 'incoming' ? '2px solid #007bff' : 'none',
            marginBottom: '-2px',
          }}
        >
          📥 Incoming Shipments {incomingBatches.length > 0 && `(${incomingBatches.length})`}
        </button>
        <button
          onClick={() => setActiveTab('current')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'current' ? '#007bff' : 'transparent',
            color: activeTab === 'current' ? 'white' : '#007bff',
            fontWeight: 'bold',
            borderBottom: activeTab === 'current' ? '2px solid #007bff' : 'none',
            marginBottom: '-2px',
          }}
        >
          📦 Current Inventory {currentBatches.length > 0 && `(${currentBatches.length})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'history' ? '#007bff' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#007bff',
            fontWeight: 'bold',
            borderBottom: activeTab === 'history' ? '2px solid #007bff' : 'none',
            marginBottom: '-2px',
          }}
        >
          Shipment History
        </button>
      </div>

      {/* Incoming Shipments Tab */}
      {activeTab === 'incoming' && (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>Incoming Shipments</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Batches transferred to you that need acknowledgement. Scan QR code to verify and log receipt conditions.
          </p>

          {loadError && (
            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
              {loadError}
            </div>
          )}

          {isLoadingBatches ? (
            <p>Loading batches...</p>
          ) : incomingBatches.length === 0 ? (
            <div style={{ backgroundColor: '#f8f9fa', padding: '40px', textAlign: 'center', borderRadius: '8px', color: '#666' }}>
              <p style={{ fontSize: '48px', margin: '0 0 10px 0' }}>📭</p>
              <p style={{ margin: 0 }}>No incoming shipments. All batches have been acknowledged.</p>
            </div>
          ) : (
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '60%' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '20%' }}>Token ID</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '20%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingBatches.map((batch) => {
                  const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                  return (
                    <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{productName}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Batch: {batchNumber}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>#{batch.tokenId}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenScanner(batch.tokenId)}
                            style={{
                              padding: '8px 16px',
                              fontSize: '14px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              width: '100%',
                            }}
                          >
                            📸 Scan & Acknowledge
                          </button>
                          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
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
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>Current Inventory</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Batches you've acknowledged and currently hold. Transfer custody to pharmacists.
          </p>

          {currentBatches.length === 0 ? (
            <div style={{ backgroundColor: '#f8f9fa', padding: '40px', textAlign: 'center', borderRadius: '8px', color: '#666' }}>
              <p style={{ fontSize: '48px', margin: '0 0 10px 0' }}>📦</p>
              <p style={{ margin: 0 }}>No batches in current inventory. Acknowledge incoming shipments first.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>📤 Direct Transfer</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Immediate transfer without shipper - select batch and enter pharmacist address below.
                </p>
                <form onSubmit={handleTransferCustody}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Select Batch:
                    </label>
                    <select
                      value={selectedBatch ?? ''}
                      onChange={(e) => setSelectedBatch(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ced4da', borderRadius: '4px' }}
                      disabled={isTransferring}
                    >
                      <option value="">-- Select a batch --</option>
                      {currentBatches.map((batch) => {
                        const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                        return (
                          <option key={batch.tokenId} value={batch.tokenId}>
                            {formatBatchName(productName, batchNumber)} - Token #{batch.tokenId}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Transfer To (Pharmacist Address):
                    </label>
                    {vouchedPartners.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setTransferTo(e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '16px',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            marginBottom: '5px',
                            backgroundColor: '#f0f8ff',
                          }}
                          disabled={isTransferring}
                        >
                          <option value="">🤝 Quick Select: Your Vouched Partners</option>
                          {vouchedPartners.map((partner) => {
                            const roleNames = ['None', 'Manufacturer', 'Distributor', 'Pharmacist'];
                            return (
                              <option key={partner.address} value={partner.address}>
                                {partner.address.substring(0, 10)}...{partner.address.substring(partner.address.length - 8)} ({roleNames[partner.role]})
                              </option>
                            );
                          })}
                        </select>
                        <p style={{ fontSize: '12px', color: '#007bff', marginBottom: '10px', fontWeight: '500' }}>
                          💡 Tip: This dropdown shows only partners you've vouched for. You can transfer to ANY registered pharmacist by entering their address below.
                        </p>
                      </div>
                    )}
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="0x... (Enter any registered pharmacist address)"
                      style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ced4da', borderRadius: '4px' }}
                      disabled={isTransferring}
                    />
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      {vouchedPartners.length > 0
                        ? '✅ You can transfer to any registered pharmacist (vouched or not)'
                        : '⚠️ Enter the pharmacist\'s wallet address (must be registered with Pharmacist role)'}
                    </p>
                  </div>

                  {transferError && (
                    <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
                      {transferError}
                    </div>
                  )}

                  {transferSuccess && (
                    <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
                      ✓ Custody transferred successfully!
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isTransferring}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      backgroundColor: isTransferring ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isTransferring ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {isTransferring ? 'Transferring...' : '📤 Transfer Custody'}
                  </button>
                </form>
              </div>

              <h3>Inventory List</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Token ID</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>QR Code</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>IoT Data</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBatches.map((batch) => {
                    const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                    return (
                      <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{productName}</div>
                          <div style={{ fontSize: '14px', color: '#666' }}>Batch: {batchNumber}</div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>#{batch.tokenId}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-block' }}>
                            <QRCodeGenerator
                              tokenId={batch.tokenId}
                              size={80}
                              productName={productName}
                              batchNumber={batchNumber}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setIotLogTokenId(batch.tokenId);
                              setIsAcknowledgmentMode(false);
                              setIotModalOpen(true);
                            }}
                            style={{
                              padding: '8px 16px',
                              fontSize: '14px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                          >
                            📡 Log Data
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Shipment History Tab */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>Shipment History ({historyBatches.length})</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Track the status of all batches that have passed through your custody, whether still with you, transferred, or acknowledged by recipient.
          </p>

          {isLoadingBatches ? (
            <p>Loading history...</p>
          ) : historyBatches.length === 0 ? (
            <div style={{ backgroundColor: '#f8f9fa', padding: '40px', textAlign: 'center', borderRadius: '8px', color: '#666' }}>
              <p style={{ fontSize: '48px', margin: '0 0 10px 0' }}>📦</p>
              <p style={{ margin: 0 }}>No batch history yet. Batches will appear here once you receive them.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', width: '10%' }}>Token ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>Product Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '20%' }}>Batch Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', width: '20%' }}>Current Owner</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '20%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBatches.map((batch) => {
                    const { productName, batchNumber } = parseTokenURI(batch.tokenURI);
                    const isWithMe = batch.currentOwner.toLowerCase() === account?.toLowerCase();
                    const isAcknowledged = acknowledgementStatus[batch.tokenId] || false;

                    // Determine status
                    let status = '📦 With Me';
                    let statusColor = '#28a745';

                    if (!isWithMe) {
                      if (isAcknowledged) {
                        status = '✅ Acknowledged';
                        statusColor = '#28a745';
                      } else {
                        status = '🚚 In Transit';
                        statusColor = '#ffc107';
                      }
                    }

                    return (
                      <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>#{batch.tokenId}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{productName}</td>
                        <td style={{ padding: '12px', color: '#666' }}>{batchNumber}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                          {isWithMe ? 'Me' : `${batch.currentOwner.substring(0, 10)}...`}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              backgroundColor: statusColor,
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '14px',
                              fontWeight: '500',
                            }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScannedTokenForAcknowledge(null);
        }}
        onScan={handleScanSuccess}
        expectedTokenId={scannedTokenForAcknowledge?.tokenId}
      />

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
          loadVouchedPartners(); // Reload the list of vouched partners
        }}
      />
    </div>
  );
}
