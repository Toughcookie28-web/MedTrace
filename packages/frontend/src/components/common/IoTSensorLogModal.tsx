/**
 * @file IoT Sensor Log Modal
 * @description Modal for logging signed IoT sensor data (temperature, humidity, location, notes)
 */

import { useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';

interface IoTSensorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
  onSuccess?: () => void;
  scanSuccessInfo?: {
    productName: string;
    batchNumber: string;
  } | null;
}

export function IoTSensorLogModal({ isOpen, onClose, tokenId, onSuccess, scanSuccessInfo }: IoTSensorLogModalProps) {
  const { signer, contracts } = useWeb3();
  const [temperature, setTemperature] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogData = async () => {
    if (!signer || !contracts.supplyChainEvents) {
      setError('Wallet not connected or contract not available');
      return;
    }

    if (!temperature || !location) {
      setError('Temperature and location are required');
      return;
    }

    setIsLogging(true);
    setError('');

    try {
      // 1. Get current timestamp
      const timestamp = Math.floor(Date.now() / 1000);

      // 2. Create message to sign
      const messageHash = ethers.solidityPackedKeccak256(
        ['uint256', 'string', 'string', 'string', 'uint256'],
        [tokenId, temperature, location, notes, timestamp]
      );

      // 3. Ask user to sign the message
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      // 4. Submit to smart contract
      const tx = await contracts.supplyChainEvents.logEvent(
        tokenId,
        temperature,
        location,
        notes,
        timestamp,
        signature
      );

      await tx.wait();

      // Success!
      alert('✅ Sensor data logged successfully!');
      setTemperature('');
      setLocation('');
      setNotes('');

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      console.error('Error logging sensor data:', err);
      if (err.code === 'ACTION_REJECTED') {
        setError('Signature rejected by user');
      } else {
        setError(err.message || 'Failed to log sensor data');
      }
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
            📡 Log IoT Sensor Data
          </h2>
          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
            Batch #{tokenId} - Sign cryptographically verified data
          </p>
        </div>

        {/* Scan Success Banner (if provided) */}
        {scanSuccessInfo && (
          <div
            style={{
              backgroundColor: '#cce5ff',
              color: '#004085',
              padding: '15px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #007bff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <span style={{ fontSize: '24px' }}>✅</span>
            <div>
              <strong>QR Code Scanned Successfully!</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: 'normal' }}>
                {scanSuccessInfo.productName} (Batch: {scanSuccessInfo.batchNumber}) - Token #{tokenId}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', fontWeight: 'normal', fontStyle: 'italic' }}>
                Please fill the form below to log receipt conditions and acknowledge the shipment.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              marginBottom: '20px',
              color: '#c00',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
            }}
          >
            Temperature (°C) *
          </label>
          <input
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="e.g., 5.1"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            disabled={isLogging}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
            }}
          >
            Location *
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Warehouse B, Cold Storage Unit 3"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            disabled={isLogging}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
            }}
          >
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Package appears intact, no visible damage"
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            disabled={isLogging}
          />
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: '#f0f8ff',
            border: '1px solid #b0d4f1',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#0066cc',
          }}
        >
          <strong>🔐 How it works:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Your data is hashed and signed with your wallet</li>
            <li>Smart contract verifies you own this batch</li>
            <li>Signature proves data authenticity and timestamp</li>
          </ul>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={isLogging}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: isLogging ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLogData}
            disabled={isLogging || !temperature || !location}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: isLogging || !temperature || !location ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLogging || !temperature || !location ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}
          >
            {isLogging ? 'Signing & Submitting...' : '✍️ Sign & Log Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
