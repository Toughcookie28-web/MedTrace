/**
 * @file Manufacturer Dashboard Component
 * @description Dashboard for manufacturers to mint batches, transfer custody, and view their inventory
 */

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { api } from '../../utils/api';
import { parseTokenURI, formatBatchName } from '../../utils/batchUtils';
import { QRCodeGenerator } from '../common/QRCodeGenerator';
import { IoTSensorLogModal } from '../common/IoTSensorLogModal';
import { CredentialApplicationModal } from '../common/CredentialApplicationModal';
import { PartnershipVouchModal } from '../common/PartnershipVouchModal';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import type { Batch } from '../../types';

export function ManufacturerDashboard() {
  const { digitalBatch, trackAndTrace, account, contracts } = useWeb3();

  // Tab state
  const [activeTab, setActiveTab] = useState<'mint' | 'transfer' | 'inventory' | 'history'>('mint');

  // Mint form state
  const [productName, setProductName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<{
    tokenId: number;
    productName: string;
    batchNumber: string;
  } | null>(null);

  // Batches state
  const [myBatches, setMyBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // History state
  const [manufacturedBatches, setManufacturedBatches] = useState<Batch[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [acknowledgementStatus, setAcknowledgementStatus] = useState<Record<number, boolean>>({});

  // Transfer state
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Vouched partners state
  const [vouchedPartners, setVouchedPartners] = useState<Array<{ address: string; role: number }>>([]);

  // IoT logging state
  const [iotModalOpen, setIotModalOpen] = useState(false);
  const [iotLogTokenId, setIotLogTokenId] = useState<number | null>(null);

  // New features modals state
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
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

  // Load manufacturer's batches
  const loadBatches = async () => {
    if (!account) return;

    try {
      setIsLoadingBatches(true);
      setLoadError(null);
      const response = await api.getStakeholderBatches(account);
      setMyBatches(response.batches);
    } catch (error) {
      console.error('Failed to load batches:', error);
      const message = error instanceof Error ? error.message : 'Failed to load batches';

      // Check if it's a "no data" type error
      const isNoDataError = message.toLowerCase().includes('no batches') ||
                           message.toLowerCase().includes('not found') ||
                           message.toLowerCase().includes('no data');

      if (isNoDataError) {
        // It's expected - just show empty state
        setMyBatches([]);
        setLoadError(null);
      } else {
        // It's a real error - show it
        setMyBatches([]);
        setLoadError(message);
      }
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Load manufacturer's history (all batches ever manufactured)
  const loadHistory = async () => {
    if (!account || !trackAndTrace) return;

    try {
      setIsLoadingHistory(true);
      const response = await api.getManufacturedBatches(account);
      setManufacturedBatches(response.batches);

      // Check acknowledgement status for each batch
      const statusMap: Record<number, boolean> = {};
      for (const batch of response.batches) {
        try {
          // Check if current owner has acknowledged receipt
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
    } catch (error) {
      console.error('Failed to load history:', error);
      setManufacturedBatches([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadBatches();
    loadHistory();
    loadVouchedPartners();
  }, [account, contracts]);

  // Real-time events subscription
  useRealtimeEvents({
    onBatchMinted: ({ tokenId, manufacturer }) => {
      // Reload if this manufacturer minted a batch
      if (account && manufacturer.toLowerCase() === account.toLowerCase()) {
        console.log(`🎉 New batch minted by me: ${tokenId}`);
        // Add delay to ensure backend indexer has processed the event (1 second)
        setTimeout(() => {
          loadBatches();
          loadHistory();
        }, 1000);
      }
    },
    onCustodyTransferred: ({ from, to }) => {
      // Reload if batch transferred away from or to this account
      if (account && (from.toLowerCase() === account.toLowerCase() || to.toLowerCase() === account.toLowerCase())) {
        console.log(`🔄 Custody changed involving my account`);
        // Add delay to ensure backend indexer has processed the event (1 second)
        setTimeout(() => {
          loadBatches();
          loadHistory();
        }, 1000);
      }
    },
    onReceiptAcknowledged: () => {
      // Reload history to update acknowledgement status
      setTimeout(() => {
        loadHistory();
      }, 1000);
    },
    onConnected: () => {
      console.log('🟢 Real-time events connected');
    },
  });

  const handleMintBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!digitalBatch || !account) {
      setMintError('Contract not initialized');
      return;
    }

    if (!productName.trim()) {
      setMintError('Product Name is required');
      return;
    }

    try {
      setIsMinting(true);
      setMintError(null);
      setMintSuccess(null);

      // Construct tokenURI with product name and batch number
      const timestamp = Date.now();
      const batchId = batchNumber.trim() || `BATCH-${timestamp}`;
      const tokenURI = `ipfs://pharmaledger/${encodeURIComponent(productName)}/${encodeURIComponent(batchId)}`;

      console.log('Minting batch with Product Name:', productName, 'Batch Number:', batchId);
      console.log('Token URI:', tokenURI);

      // Mint batch
      const tx = await digitalBatch.mintBatch(account, tokenURI);
      console.log('Transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // Extract token ID from event
      const mintEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = digitalBatch.interface.parseLog(log);
          return parsed?.name === 'BatchMinted';
        } catch {
          return false;
        }
      });

      if (mintEvent) {
        const parsed = digitalBatch.interface.parseLog(mintEvent);
        const tokenId = Number(parsed?.args[0]);

        // Save mint details including the generated batch number
        const actualBatchNumber = batchNumber.trim() || `BATCH-${timestamp}`;
        setMintSuccess({
          tokenId,
          productName: productName,
          batchNumber: actualBatchNumber,
        });

        console.log('✅ Batch minted successfully! Token ID:', tokenId);

        // Clear form
        setProductName('');
        setBatchNumber('');

        // Real-time event will trigger automatic refresh
      }
    } catch (error: any) {
      console.error('Failed to mint batch:', error);
      setMintError(error.message || 'Failed to mint batch');
    } finally {
      setIsMinting(false);
    }
  };

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

      // Approve TrackAndTrace to transfer the token
      const trackAndTraceAddress = await trackAndTrace.getAddress();
      console.log('Approving TrackAndTrace:', trackAndTraceAddress);
      const approveTx = await digitalBatch.approve(trackAndTraceAddress, selectedBatch);
      await approveTx.wait();

      // Transfer custody
      console.log('Transferring custody of batch', selectedBatch, 'to', recipientAddress);
      const tx = await trackAndTrace.transferCustody(selectedBatch, recipientAddress);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

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
          onClick={() => setCredentialModalOpen(true)}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          📜 Apply for Credential
        </button>
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

      {/* Tab Navigation */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('mint')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'mint' ? '#007bff' : 'transparent',
            color: activeTab === 'mint' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'mint' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Mint Batch
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'transfer' ? '#007bff' : 'transparent',
            color: activeTab === 'transfer' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'transfer' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Transfer Custody
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'inventory' ? '#007bff' : 'transparent',
            color: activeTab === 'inventory' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'inventory' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Batch Inventory
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: activeTab === 'history' ? '#007bff' : 'transparent',
            color: activeTab === 'history' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #007bff' : 'none',
            cursor: 'pointer',
          }}
        >
          Shipment History
        </button>
      </div>

      {/* Mint Batch Tab */}
      {activeTab === 'mint' && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          {/* Mint Batch Form */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '8px',
              marginBottom: '30px',
              border: '1px solid #dee2e6',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Mint New Batch</h2>
            <form onSubmit={handleMintBatch}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Product Name: <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Aspirin 100mg, Vaccine XYZ"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                  disabled={isMinting}
                  required
                />
                <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Enter a human-readable name for this pharmaceutical product
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Batch Number (Optional):
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g., LOT-2025-001"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  disabled={isMinting}
                />
                <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Optional: Enter your internal batch/lot number. Auto-generated if left blank.
                </p>
              </div>

              {mintError && (
                <div
                  style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                  }}
                >
                  {mintError}
                </div>
              )}

              {mintSuccess !== null && (
                <div
                  style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                  }}
                >
                  ✓ Batch minted successfully! Token ID: {mintSuccess.tokenId}
                </div>
              )}

              <button
                type="submit"
                disabled={isMinting}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: isMinting ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isMinting ? 'not-allowed' : 'pointer',
                }}
              >
                {isMinting ? 'Minting...' : 'Mint Batch'}
              </button>
            </form>
          </div>

          {/* Show QR Code for newly minted batch */}
          {mintSuccess !== null && (
            <div
              style={{
                backgroundColor: '#fff',
                padding: '30px',
                borderRadius: '8px',
                marginBottom: '30px',
                border: '2px solid #28a745',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#28a745' }}>✓ Batch Minted Successfully!</h3>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>Product:</strong> {mintSuccess.productName}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Batch Number:</strong> {mintSuccess.batchNumber}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Token ID:</strong> #{mintSuccess.tokenId}
                </p>
              </div>
              <QRCodeGenerator
                tokenId={mintSuccess.tokenId}
                size={200}
                productName={mintSuccess.productName}
                batchNumber={mintSuccess.batchNumber}
              />
              <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
                Print or save this QR code to attach to the physical batch.
                <br />
                <strong>Next step:</strong> Go to "Transfer Custody" tab to transfer this batch to a distributor.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transfer Custody Tab */}
      {activeTab === 'transfer' && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '8px',
              marginBottom: '30px',
              border: '1px solid #dee2e6',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Transfer Custody to Distributor</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Transfer your minted batches to a distributor to move them through the supply chain.
            </p>
            <form onSubmit={handleTransferCustody}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Batch:
                </label>
                <select
                  value={selectedBatch ?? ''}
                  onChange={(e) => setSelectedBatch(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  disabled={isTransferring}
                >
                  <option value="">-- Select a batch --</option>
                  {myBatches.map((batch) => {
                    const { productName: parsedName, batchNumber: parsedBatchNum } = parseTokenURI(batch.tokenURI);
                    return (
                      <option key={batch.tokenId} value={batch.tokenId}>
                        {formatBatchName(parsedName, parsedBatchNum)} - Token #{batch.tokenId}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Transfer To (Distributor Address):
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
                      💡 Tip: This dropdown shows only partners you've vouched for. You can transfer to ANY registered distributor by entering their address below.
                    </p>
                  </div>
                )}
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="0x... (Enter any registered distributor address)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  disabled={isTransferring}
                />
                <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  {vouchedPartners.length > 0
                    ? '✅ You can transfer to any registered distributor (vouched or not)'
                    : '⚠️ Enter the distributor\'s wallet address (must be registered with Distributor role)'}
                </p>
              </div>

              {transferError && (
                <div
                  style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                  }}
                >
                  {transferError}
                </div>
              )}

              {transferSuccess && (
                <div
                  style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                  }}
                >
                  ✓ Custody transferred successfully! The batch is now with the distributor.
                </div>
              )}

              <button
                type="submit"
                disabled={isTransferring || selectedBatch === null}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: isTransferring ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isTransferring || selectedBatch === null ? 'not-allowed' : 'pointer',
                }}
              >
                {isTransferring ? 'Transferring...' : 'Transfer Custody'}
              </button>
            </form>
          </div>

          {/* My Batches for Transfer */}
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
            }}
          >
            <h2 style={{ marginTop: 0 }}>My Batches Available for Transfer ({myBatches.length})</h2>

            {loadError && (
              <div
                style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                }}
              >
                {loadError}
              </div>
            )}
            {isLoadingBatches ? (
              <p>Loading batches...</p>
            ) : myBatches.length === 0 ? (
              <p style={{ color: '#666' }}>No batches available. Mint a batch first.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Product Name</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Batch Number</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Token ID</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBatches.map((batch) => {
                      const { productName: parsedName, batchNumber: parsedBatchNum } = parseTokenURI(batch.tokenURI);
                      return (
                        <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{parsedName}</td>
                          <td style={{ padding: '12px', color: '#666' }}>{parsedBatchNum}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>#{batch.tokenId}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <QRCodeGenerator
                                tokenId={batch.tokenId}
                                size={100}
                                productName={parsedName}
                                batchNumber={parsedBatchNum}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Inventory Tab */}
      {activeTab === 'inventory' && (
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
          <h2 style={{ marginTop: 0 }}>My Batch Inventory ({myBatches.length})</h2>

          {loadError && (
            <div
              style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '15px',
              }}
            >
              {loadError}
            </div>
          )}

          {isLoadingBatches ? (
            <p>Loading batches...</p>
          ) : myBatches.length === 0 ? (
            <p style={{ color: '#666' }}>No batches minted yet. Go to "Mint Batch" tab to create your first batch.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Batch Number</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Token ID</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>QR Code</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>IoT Data</th>
                  </tr>
                </thead>
                <tbody>
                  {myBatches.map((batch) => {
                    const { productName: parsedName, batchNumber: parsedBatchNum } = parseTokenURI(batch.tokenURI);
                    return (
                      <tr key={batch.tokenId} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{parsedName}</td>
                        <td style={{ padding: '12px', color: '#666' }}>{parsedBatchNum}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>#{batch.tokenId}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <QRCodeGenerator
                              tokenId={batch.tokenId}
                              size={100}
                              productName={parsedName}
                              batchNumber={parsedBatchNum}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setIotLogTokenId(batch.tokenId);
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
            </div>
          )}
        </div>
      )}

      {/* Shipment History Tab */}
      {activeTab === 'history' && (
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
          <h2 style={{ marginTop: 0 }}>Shipment History ({manufacturedBatches.length})</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Track the status of all batches you've manufactured, whether they're still with you, in transit, or acknowledged by the recipient.
          </p>

          {isLoadingHistory ? (
            <p>Loading history...</p>
          ) : manufacturedBatches.length === 0 ? (
            <p style={{ color: '#666' }}>No batches manufactured yet. Go to "Mint Batch" tab to create your first batch.</p>
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
                  {manufacturedBatches.map((batch) => {
                    const { productName: parsedName, batchNumber: parsedBatchNum } = parseTokenURI(batch.tokenURI);
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
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{parsedName}</td>
                        <td style={{ padding: '12px', color: '#666' }}>{parsedBatchNum}</td>
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

      {/* IoT Sensor Log Modal */}
      {iotLogTokenId !== null && (
        <IoTSensorLogModal
          isOpen={iotModalOpen}
          onClose={() => {
            setIotModalOpen(false);
            setIotLogTokenId(null);
          }}
          tokenId={iotLogTokenId}
          onSuccess={() => {
            console.log('IoT data logged successfully');
          }}
        />
      )}

      {/* Credential Application Modal */}
      <CredentialApplicationModal
        isOpen={credentialModalOpen}
        onClose={() => setCredentialModalOpen(false)}
        onSuccess={() => {
          console.log('Credential applied successfully');
          loadBatches();
        }}
      />

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
