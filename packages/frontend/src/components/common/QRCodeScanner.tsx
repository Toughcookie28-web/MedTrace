/**
 * @file QR Code Scanner Component
 * @description Scans QR codes and navigates to verification page
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

interface QRCodeScannerProps {
  onScanSuccess?: (tokenId: number) => void;
  onScanError?: (error: string) => void;
}

export function QRCodeScanner({ onScanSuccess, onScanError }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error('Failed to stop scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract tokenId from URL
          const url = new URL(decodedText);
          const tokenIdParam = url.searchParams.get('tokenId');

          if (tokenIdParam) {
            const tokenId = parseInt(tokenIdParam, 10);
            console.log('✅ QR Code scanned - Token ID:', tokenId);

            // Stop scanning
            scanner.stop().then(() => {
              setIsScanning(false);
              if (onScanSuccess) {
                onScanSuccess(tokenId);
              }
              // Navigate to verification page
              navigate(`/verify?tokenId=${tokenId}`);
            });
          } else {
            setError('Invalid QR code: No tokenId found');
            if (onScanError) {
              onScanError('Invalid QR code format');
            }
          }
        },
        () => {
          // Ignore common scanning errors (no QR code in view)
          // Only log significant errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to start camera';
      setError(errorMsg);
      if (onScanError) {
        onScanError(errorMsg);
      }
      console.error('Scanner error:', err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  return (
    <div className="qr-scanner-container" style={{ textAlign: 'center', padding: '20px' }}>
      <div
        id="qr-reader"
        style={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          border: isScanning ? '2px solid #007bff' : '2px dashed #ccc',
          borderRadius: '8px',
          minHeight: '300px',
        }}
      />

      {error && (
        <div style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#fee' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {!isScanning ? (
          <button
            onClick={startScanning}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanning}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Stop Scanning
          </button>
        )}
      </div>

      <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        {isScanning
          ? 'Position the QR code within the camera view'
          : 'Click "Start Scanning" to begin'}
      </p>
    </div>
  );
}
