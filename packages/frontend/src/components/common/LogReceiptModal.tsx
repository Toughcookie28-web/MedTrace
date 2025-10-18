/**
 * @file Log Receipt Modal Component
 * @description Modal for acknowledging receipt of a batch with structured data entry
 * (temperature, location, notes)
 */

import { useState, FormEvent } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';

interface LogReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
  productName: string;
  batchNumber: string;
  onSuccess?: () => void;
}

export function LogReceiptModal({
  isOpen,
  onClose,
  tokenId,
  productName,
  batchNumber,
  onSuccess,
}: LogReceiptModalProps) {
  const { trackAndTrace, account } = useWeb3();

  const [temperature, setTemperature] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!trackAndTrace || !account) {
      setError('Wallet not connected');
      return;
    }

    if (!temperature.trim()) {
      setError('Temperature is required');
      return;
    }

    if (!location.trim()) {
      setError('Location is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create structured JSON for receipt data
      const receiptData = {
        type: 'receipt_acknowledgement',
        temperature: `${temperature}°C`,
        location: location.trim(),
        timestamp: new Date().toISOString(),
        notes: notes.trim() || undefined,
        productName,
        batchNumber,
      };

      console.log('Acknowledging receipt with data:', receiptData);

      // Call acknowledgeReceipt on smart contract
      const tx = await trackAndTrace.acknowledgeReceipt(
        tokenId,
        JSON.stringify(receiptData)
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Receipt acknowledged successfully!');

      // Call success callback
      onSuccess?.();

      // Close modal and reset form
      handleClose();
    } catch (err: any) {
      console.error('Failed to acknowledge receipt:', err);
      setError(err.message || 'Failed to acknowledge receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTemperature('');
    setLocation('');
    setNotes('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '10px' }}>
          Acknowledge Receipt & Log Conditions
        </h2>

        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <div><strong>Product:</strong> {productName}</div>
          <div><strong>Batch:</strong> {batchNumber}</div>
          <div><strong>Token ID:</strong> #{tokenId}</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Temperature Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Temperature (°C) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g., 5"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
              }}
              disabled={isSubmitting}
              required
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
              Enter the storage/arrival temperature in Celsius
            </p>
          </div>

          {/* Location Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Location <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Warehouse A, Cold Storage Room 3"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
              }}
              disabled={isSubmitting}
              required
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
              Where is the batch currently stored?
            </p>
          </div>

          {/* Notes Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Package arrived in good condition, seals intact"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Auto-captured timestamp info */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#666'
          }}>
            ℹ️ Timestamp will be automatically captured: {new Date().toLocaleString()}
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                backgroundColor: '#f8d7da',
                color: '#721c24',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '15px',
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#333',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isSubmitting ? '#6c757d' : '#28a745',
                color: 'white',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isSubmitting ? 'Acknowledging...' : 'Acknowledge Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
