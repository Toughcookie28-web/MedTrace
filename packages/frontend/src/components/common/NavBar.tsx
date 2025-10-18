/**
 * @file Navigation Bar Component
 * @description Top navigation with wallet connection controls
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { QRScannerModal } from './QRScannerModal';
import { useNavigate } from 'react-router-dom';

export function NavBar() {
  const { account, isConnected, disconnectWallet } = useWeb3();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleDisconnect = async () => {
    if (window.confirm('Are you sure you want to disconnect your wallet?')) {
      await disconnectWallet();
    }
  };

  const handleScanSuccess = (scannedTokenId: number) => {
    setScannerOpen(false);
    navigate(`/verify?tokenId=${scannedTokenId}`);
  };

  return (
    <nav
      style={{
        backgroundColor: '#007bff',
        padding: '15px 30px',
        color: 'white',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          to="/"
          style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '24px',
            fontWeight: 'bold',
          }}
        >
          MedTrace
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Global Verify Batch Button */}
          <button
            onClick={() => setScannerOpen(true)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Verify Batch [---]
          </button>

          {isConnected && account && (
            <>
              <span
                style={{
                  fontSize: '14px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                }}
              >
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </span>
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c82333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545';
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </nav>
  );
}
