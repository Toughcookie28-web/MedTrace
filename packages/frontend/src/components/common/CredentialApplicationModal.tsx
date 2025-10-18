/**
 * @file Credential Application Modal
 * @description Modal for manufacturers to apply for verified credentials
 * For MVP: Auto-approves to simulate oracle verification
 */

import { useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';

interface CredentialApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CredentialApplicationModal({
  isOpen,
  onClose,
  onSuccess,
}: CredentialApplicationModalProps) {
  const { signer, contracts } = useWeb3();

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [businessRegNum, setBusinessRegNum] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('FDA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer || !contracts.stakeholderRegistry) {
      setError('Wallet not connected or contract not available');
      return;
    }

    if (!licenseFile) {
      setError('Please upload a license document');
      return;
    }

    if (!businessRegNum.trim()) {
      setError('Business registration number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // In a real system, we'd upload to IPFS here
      // For MVP, we'll just hash the file locally
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const licenseHash = ethers.keccak256(uint8Array);

          console.log('Applying for credential...');
          console.log('License hash:', licenseHash);
          console.log('Business reg:', businessRegNum);
          console.log('Authority:', issuingAuthority);

          // Call the smart contract
          const tx = await contracts.stakeholderRegistry.applyForCredential(
            licenseHash,
            businessRegNum,
            issuingAuthority
          );

          console.log('Transaction sent:', tx.hash);
          await tx.wait();
          console.log('Transaction confirmed!');

          alert('✅ Credential application approved!\n\nFor this MVP, credentials are automatically verified to simulate oracle functionality. In production, this would verify against government APIs.');

          // Reset form
          setLicenseFile(null);
          setBusinessRegNum('');
          setIssuingAuthority('FDA');

          if (onSuccess) {
            onSuccess();
          }

          onClose();
        } catch (err: any) {
          console.error('Error in file processing:', err);
          setError(err.message || 'Failed to apply for credential');
        } finally {
          setIsSubmitting(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setIsSubmitting(false);
      };

      reader.readAsArrayBuffer(licenseFile);
    } catch (err: any) {
      console.error('Error applying for credential:', err);
      setError(err.message || 'Failed to apply for credential');
      setIsSubmitting(false);
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
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
            📜 Apply for Manufacturer Credential
          </h2>
          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
            Upload your business license to get verified
          </p>
        </div>

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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#333',
              }}
            >
              Business License Document *
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
            {licenseFile && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Selected: {licenseFile.name}
              </p>
            )}
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
              Business Registration Number *
            </label>
            <input
              type="text"
              value={businessRegNum}
              onChange={(e) => setBusinessRegNum(e.target.value)}
              placeholder="e.g., BRN-123456789"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
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
              Issuing Authority *
            </label>
            <select
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            >
              <option value="FDA">FDA (US)</option>
              <option value="EMA">EMA (EU)</option>
              <option value="PMDA">PMDA (Japan)</option>
              <option value="MHRA">MHRA (UK)</option>
              <option value="TGA">TGA (Australia)</option>
            </select>
          </div>

          <div
            style={{
              padding: '15px',
              backgroundColor: '#f0f8ff',
              border: '1px solid #b0d4f1',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#0066cc',
            }}
          >
            <strong>🤖 MVP Auto-Approval</strong>
            <p style={{ margin: '8px 0 0 0' }}>
              For demonstration purposes, credentials are automatically verified. In production, this
              would query government APIs via an oracle to verify your license authenticity.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !licenseFile || !businessRegNum}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor:
                  isSubmitting || !licenseFile || !businessRegNum ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isSubmitting || !licenseFile || !businessRegNum
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: '500',
              }}
            >
              {isSubmitting ? 'Submitting...' : '✅ Submit & Get Verified'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
