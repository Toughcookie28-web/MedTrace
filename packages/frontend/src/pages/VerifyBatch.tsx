/**
 * @file Verify Batch Page
 * @description Public page for verifying batch authenticity via QR code
 * No wallet connection required - uses backend API for data
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { Batch, BatchEvent, CustodyRecord, StakeholderRoleType } from '../types';
import { QRCodeGenerator } from '../components/common/QRCodeGenerator';

interface StakeholderInfo {
  address: string;
  role: StakeholderRoleType;
  roleName: string;
}

export function VerifyBatch() {
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('tokenId');

  const [batch, setBatch] = useState<Batch | null>(null);
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [custodyHistory, setCustodyHistory] = useState<CustodyRecord[]>([]);
  const [stakeholderInfo, setStakeholderInfo] = useState<Map<string, StakeholderInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId) {
      setError('No token ID provided');
      setIsLoading(false);
      return;
    }

    const fetchBatchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const tokenIdNum = parseInt(tokenId, 10);

        // Fetch batch details
        const batchData = await api.getBatch(tokenIdNum);
        setBatch(batchData);

        // Fetch events
        const eventsData = await api.getBatchEvents(tokenIdNum, 1, 100);
        setEvents(eventsData.data);

        // Fetch custody history
        const custodyData = await api.getCustodyHistory(tokenIdNum, 1, 100);
        setCustodyHistory(custodyData.data);

        // Collect all unique addresses from custody history, batch, and events
        const addresses = new Set<string>();
        custodyData.data.forEach((record) => {
          addresses.add(record.from.toLowerCase());
          addresses.add(record.to.toLowerCase());
        });
        addresses.add(batchData.manufacturer.toLowerCase());
        addresses.add(batchData.currentOwner.toLowerCase());
        eventsData.data.forEach((event) => {
          addresses.add(event.logger.toLowerCase());
        });

        // Fetch stakeholder info for all addresses
        const stakeholders = new Map<string, StakeholderInfo>();
        console.log('📋 Fetching stakeholder info for addresses:', Array.from(addresses));

        await Promise.all(
          Array.from(addresses).map(async (address) => {
            try {
              const info = await api.getStakeholderRole(address);
              console.log(`✅ Fetched info for ${address}:`, info);
              stakeholders.set(address.toLowerCase(), info);
            } catch (err) {
              console.warn(`⚠️ Could not fetch stakeholder info for ${address}:`, err);
              // Add address to map with "None" role so it doesn't fail silently
              stakeholders.set(address.toLowerCase(), {
                address,
                role: 0,
                roleName: 'None'
              });
            }
          })
        );

        console.log('📊 Stakeholder info map:', stakeholders);
        setStakeholderInfo(stakeholders);

        console.log('✅ Batch data loaded for verification');
      } catch (err: any) {
        console.error('Failed to fetch batch data:', err);
        setError(err.message || 'Failed to load batch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchData();
  }, [tokenId]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Loading batch data...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Batch not found</h2>
        <p>Token ID: {tokenId}</p>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStakeholderDisplay = (address: string): string => {
    const info = stakeholderInfo.get(address.toLowerCase());
    console.log(`🔍 Looking up ${address.toLowerCase()}, found:`, info);
    if (info && info.roleName !== 'None') {
      return `${info.roleName} (${formatAddress(address)})`;
    }
    return formatAddress(address);
  };

  const renderStakeholderCell = (address: string, colorClass: 'from' | 'to') => {
    const info = stakeholderInfo.get(address.toLowerCase());
    const colors = {
      from: '#495057', // Same darker gray as 'to'
      to: '#495057',   // Darker gray
    };

    if (info && info.roleName !== 'None') {
      return (
        <span>
          <strong style={{ color: colors[colorClass] }}>{info.roleName}</strong>
          <span style={{ color: '#999', marginLeft: '4px' }}>({formatAddress(address)})</span>
        </span>
      );
    }
    return <span style={{ color: '#666' }}>{formatAddress(address)}</span>;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const parseEventData = (eventData: string) => {
    try {
      const parsed = JSON.parse(eventData);
      // Check if it's IoT sensor data
      if (parsed.type === 'iot_sensor_reading' && parsed.sensorData) {
        return {
          isIoT: true,
          temperature: parsed.sensorData.temperature,
          humidity: parsed.sensorData.humidity,
          location: parsed.sensorData.location,
          notes: parsed.sensorData.notes,
          timestamp: parsed.timestamp,
        };
      }
      // Check if it's receipt acknowledgment
      if (parsed.type === 'receipt_acknowledgement') {
        return {
          isReceipt: true,
          timestamp: parsed.timestamp,
        };
      }
      // Return parsed JSON for other structured data
      return { isParsed: true, data: parsed };
    } catch {
      // Not JSON, return as plain text
      return { isPlain: true, text: eventData };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>Batch Verification</h1>
        <p style={{ color: '#666' }}>Public verification of pharmaceutical batch authenticity</p>
      </div>

      {/* Batch Details Card */}
      <div
        style={{
          backgroundColor: '#f8f9fa',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '2px solid #28a745',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#28a745' }}>✓ Authentic Batch</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p>
              <strong>Token ID:</strong> {batch.tokenId}
            </p>
            <p>
              <strong>Manufacturer:</strong> {getStakeholderDisplay(batch.manufacturer)}
            </p>
            <p>
              <strong>Current Owner:</strong> {getStakeholderDisplay(batch.currentOwner)}
            </p>
            {batch.mintedAt && (
              <p>
                <strong>Minted:</strong> {formatTimestamp(batch.mintedAt)}
              </p>
            )}
          </div>
          <div>
            <QRCodeGenerator tokenId={batch.tokenId} size={150} />
          </div>
        </div>
      </div>

      {/* Custody History */}
      <div style={{ marginBottom: '30px' }}>
        <h2>📦 Custody History</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Complete chain of custody showing all transfers from manufacturer to current owner
        </p>
        {custodyHistory.length === 0 ? (
          <p style={{ color: '#666' }}>No custody transfers recorded</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>From</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>To</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {custodyHistory.map((record, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      {renderStakeholderCell(record.from, 'from')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {renderStakeholderCell(record.to, 'to')}
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {formatTimestamp(record.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supply Chain Events */}
      <div>
        <h2>📋 Supply Chain Events</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Recorded events including IoT sensor readings, quality checks, and other supply chain activities
        </p>
        {events.length === 0 ? (
          <p style={{ color: '#666' }}>No events logged</p>
        ) : (
          <div>
            {/* Sort events by timestamp (latest to earliest) */}
            {[...events].sort((a, b) => b.timestamp - a.timestamp).map((event, index) => {
              const parsedEvent = parseEventData(event.eventData);

              // Receipt Acknowledgment styling (green)
              if (parsedEvent.isReceipt) {
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#d4edda',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      border: '2px solid #28a745',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#155724', marginBottom: '8px' }}>
                      ✅ Receipt Confirmed
                    </div>
                    <div style={{ fontSize: '13px', color: '#155724', marginBottom: '8px' }}>
                      Batch received and confirmed by stakeholder
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <strong>Acknowledged by:</strong> {getStakeholderDisplay(event.logger)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      <strong>Time:</strong> {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                );
              }

              // Logged Events styling (blue)
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#fff',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    border: '2px solid #007bff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '15px', color: '#666', marginBottom: '4px' }}>
                      <strong style={{ color: '#007bff' }}>Logged by:</strong>{' '}
                      <span style={{ fontWeight: '500' }}>{getStakeholderDisplay(event.logger)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <strong>Time:</strong> {formatTimestamp(event.timestamp)}
                    </div>
                  </div>

                  {parsedEvent.isIoT ? (
                    <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <div style={{ marginBottom: '8px', fontWeight: '600', color: '#17a2b8', fontSize: '14px' }}>
                        📡 IoT Sensor Reading
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ fontWeight: '500', color: '#555' }}>Temperature:</span>{' '}
                          <span style={{ color: '#28a745', fontWeight: '600' }}>{parsedEvent.temperature}°C</span>
                        </div>
                        {parsedEvent.humidity && (
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontWeight: '500', color: '#555' }}>Humidity:</span>{' '}
                            <span style={{ color: '#17a2b8', fontWeight: '600' }}>{parsedEvent.humidity}%</span>
                          </div>
                        )}
                        {parsedEvent.location && (
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontWeight: '500', color: '#555' }}>Location:</span>{' '}
                            <span>{parsedEvent.location}</span>
                          </div>
                        )}
                        {parsedEvent.notes && (
                          <div style={{ fontStyle: 'italic', color: '#666', fontSize: '12px' }}>
                            <span style={{ fontWeight: '500', color: '#555' }}>Notes:</span> {parsedEvent.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : parsedEvent.isParsed ? (
                    <div>
                      <pre style={{
                        margin: 0,
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        fontSize: '12px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        {JSON.stringify(parsedEvent.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                      <p style={{ margin: 0, color: '#333', fontSize: '13px' }}>{parsedEvent.text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', color: '#666' }}>
        <p>
          This batch is recorded on the blockchain and can be independently verified at any time.
        </p>
        <p style={{ fontSize: '14px' }}>
          Powered by MedTrace - Blockchain-based Pharmaceutical Supply Chain Tracking
        </p>
      </div>
    </div>
  );
}
