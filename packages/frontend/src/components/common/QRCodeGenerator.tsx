/**
 * @file QR Code Generator Component
 * @description Generates QR codes for batch verification links
 */

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  tokenId: number;
  size?: number;
  productName?: string;
  batchNumber?: string;
}

export function QRCodeGenerator({ tokenId, size = 200, productName, batchNumber }: QRCodeGeneratorProps) {
  // Generate verification URL
  const verificationUrl = `${window.location.origin}/verify?tokenId=${tokenId}`;

  return (
    <div className="qr-code-container" style={{ textAlign: 'center', padding: '20px' }}>
      <QRCodeSVG
        value={verificationUrl}
        size={size}
        level="H"
        includeMargin={true}
        style={{ border: '10px solid white', borderRadius: '8px' }}
      />
      {productName && batchNumber ? (
        <>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666', marginBottom: '2px' }}>
            Scan to verify: <strong style={{ color: '#333' }}>{productName}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
            Batch: {batchNumber}
          </p>
        </>
      ) : (
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Scan to verify: Batch #{tokenId}
        </p>
      )}
      <p style={{ fontSize: '12px', color: '#999', wordBreak: 'break-all', marginTop: '8px' }}>
        {verificationUrl}
      </p>
    </div>
  );
}
