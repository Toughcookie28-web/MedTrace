/**
 * @file QR Scanner Modal Component
 * @description Modal with camera-based QR code scanning for batch verification
 */

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (tokenId: number) => void;
  expectedTokenId?: number; // If provided, validates that scanned QR matches this tokenId
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  expectedTokenId,
}: QRScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const hasScannedRef = useRef(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivId = 'qr-scanner-' + Math.random().toString(36).substring(7);

  useEffect(() => {
    if (isOpen) {
      hasScannedRef.current = false;
      setScanning(true);
      setError(null);

      // Initialize scanner
      setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            scannerDivId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            false
          );

          scannerRef.current.render(
            (decodedText) => handleScan(decodedText),
            (errorMessage) => {
              // Ignore repetitive errors
              if (!errorMessage.includes('NotFoundException')) {
                console.log('Scanner error:', errorMessage);
              }
            }
          );
        }
      }, 100);
    }

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.log('Scanner cleanup error:', err);
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen, scannerDivId]);

  const handleScan = (result: string) => {
    if (!scanning || hasScannedRef.current) return;

    try {
      console.log('📸 QR Code scanned:', result);

      // Extract tokenId from verification URL
      // Expected format: http://localhost:5174/verify?tokenId=X
      const url = new URL(result);
      const tokenIdParam = url.searchParams.get('tokenId');

      if (!tokenIdParam) {
        console.error('❌ Invalid QR code: No tokenId found in URL:', result);
        setError('Invalid QR code: No tokenId found');
        setScanning(false);
        return;
      }

      const scannedTokenId = parseInt(tokenIdParam, 10);

      if (isNaN(scannedTokenId)) {
        console.error('❌ Invalid QR code: tokenId is not a number:', tokenIdParam);
        setError('Invalid QR code: tokenId is not a number');
        setScanning(false);
        return;
      }

      console.log(`✓ Extracted Token ID: ${scannedTokenId}`);

      // If expectedTokenId is provided, validate match
      if (expectedTokenId !== undefined && scannedTokenId !== expectedTokenId) {
        console.error(`❌ Token ID mismatch! Expected #${expectedTokenId}, but scanned #${scannedTokenId}`);
        setError(`❌ Token ID mismatch! Expected #${expectedTokenId}, but scanned #${scannedTokenId}`);
        setScanning(false);
        setTimeout(() => {
          onClose();
        }, 2000);
        return;
      }

      // Success!
      hasScannedRef.current = true;
      setScanning(false);
      console.log('✅ QR code validated successfully, tokenId:', scannedTokenId);
      onScan(scannedTokenId);
    } catch (err) {
      console.error('❌ Failed to parse QR code:', err);
      console.error('   Raw QR data:', result);
      setError('Invalid QR code format');
      setScanning(false);
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleanup error:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setError(null);
    hasScannedRef.current = false;
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
          padding: '20px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Scan QR Code</h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {expectedTokenId !== undefined && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px',
          }}>
            📦 Verifying Token ID: <strong>#{expectedTokenId}</strong>
          </div>
        )}

        <div
          id={scannerDivId}
          style={{
            width: '100%',
            display: scanning ? 'block' : 'none',
          }}
        />

        {!scanning && (
          <div
            style={{
              width: '100%',
              padding: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: error ? '#f8d7da' : '#d4edda',
              borderRadius: '8px',
              fontSize: '48px',
            }}
          >
            {error ? '❌' : '✅'}
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginTop: '15px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {scanning && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '15px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            📸 Position the QR code within the frame
          </div>
        )}

        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#333',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
