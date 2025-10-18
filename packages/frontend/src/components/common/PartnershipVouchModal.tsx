/**
 * @file Partnership Vouch Modal
 * @description Modal for stakeholders to vouch for downstream partners (recursive trust chain)
 * Allows Manufacturers to vouch for Distributors, Distributors to vouch for Pharmacies, etc.
 */

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { ethers } from 'ethers';

interface PartnershipVouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PartnershipVouchModal({
  isOpen,
  onClose,
  onSuccess,
}: PartnershipVouchModalProps) {
  const { signer, contracts, account: address } = useWeb3();

  const [partnerAddress, setPartnerAddress] = useState('');
  const [partnerRole, setPartnerRole] = useState<number>(3); // Default to Pharmacist (most common downstream role)
  const [myRole, setMyRole] = useState<number>(0);
  const [myTrustChain, setMyTrustChain] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🔄 PartnershipVouchModal useEffect triggered');
    console.log('  - isOpen:', isOpen);
    console.log('  - address:', address);
    console.log('  - stakeholderRegistry:', contracts.stakeholderRegistry);
    console.log('  - partnershipRegistry:', contracts.partnershipRegistry);

    if (isOpen && address && contracts.stakeholderRegistry && contracts.partnershipRegistry) {
      console.log('✅ All conditions met, loading verification status...');
      loadMyVerificationStatus();
    } else {
      console.log('⚠️ Not loading verification - missing requirements');
    }
  }, [isOpen, address, contracts]);

  // Auto-correct partner role when myRole changes
  useEffect(() => {
    if (myRole === 0) return; // Not loaded yet

    const availableRoles = getAvailableRoles();
    if (availableRoles.length > 0) {
      // If current partnerRole is not in available roles, set to first available
      const isCurrentRoleValid = availableRoles.some(r => r.value === partnerRole);
      if (!isCurrentRoleValid) {
        console.log(`🔧 Auto-correcting partner role from ${partnerRole} to ${availableRoles[0].value}`);
        setPartnerRole(availableRoles[0].value);
      }
    }
  }, [myRole]);

  const loadMyVerificationStatus = async () => {
    try {
      console.log('🔍 Loading verification status for address:', address);
      console.log('🔍 StakeholderRegistry contract:', contracts.stakeholderRegistry?.target);
      console.log('🔍 PartnershipRegistry contract:', contracts.partnershipRegistry?.target);

      // Get my role
      const role = await contracts.stakeholderRegistry!.getRole(address);
      console.log('🔍 Role returned:', role, 'as number:', Number(role));
      setMyRole(Number(role));

      // Check if I'm verified
      if (Number(role) === 1) {
        // Manufacturer: Check credential
        console.log('🔍 Checking credential for Manufacturer...');
        const hasCredential = await contracts.stakeholderRegistry!.hasVerifiedCredential(address);
        console.log('🔍 Has credential:', hasCredential);
        setIsVerified(hasCredential);
      } else {
        // Non-Manufacturer: Check if I'm vouched for
        console.log('🔍 Checking partnership for non-Manufacturer...');
        const partnership = await contracts.partnershipRegistry!.partnerships(address);
        console.log('🔍 Partnership:', partnership);
        setIsVerified(partnership.isActive);
      }

      // Get my trust chain
      const chainAddresses = await contracts.partnershipRegistry!.getTrustChain(address);
      console.log('🔍 Trust chain:', chainAddresses);
      setMyTrustChain(chainAddresses);
    } catch (err: any) {
      console.error('❌ Error loading verification status:', err);
    }
  };

  const getRoleName = (role: number): string => {
    const roles = ['None', 'Manufacturer', 'Distributor', 'Pharmacist'];
    return roles[role] || 'Unknown';
  };

  const getAvailableRoles = (): Array<{ value: number; label: string }> => {
    // Manufacturers can vouch for Distributors or Pharmacists
    if (myRole === 1) {
      return [
        { value: 2, label: 'Distributor' },
        { value: 3, label: 'Pharmacist' },
      ];
    }
    // Distributors can vouch for Pharmacists
    if (myRole === 2) {
      return [{ value: 3, label: 'Pharmacist' }];
    }
    // Pharmacists typically don't vouch for others in supply chain
    return [];
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer || !contracts.partnershipRegistry || !contracts.stakeholderRegistry) {
      setError('Wallet not connected or contract not available');
      return;
    }

    if (!isVerified) {
      setError('You must be verified before vouching for partners');
      return;
    }

    if (!ethers.isAddress(partnerAddress)) {
      setError('Invalid partner address');
      return;
    }

    if (partnerAddress.toLowerCase() === address?.toLowerCase()) {
      setError('Cannot vouch for yourself');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Establishing partnership...');
      console.log('Partner:', partnerAddress);
      console.log('Role:', partnerRole);

      // Check if partner already has a role registered
      const existingRole = await contracts.stakeholderRegistry.getRole(partnerAddress);
      const existingRoleNumber = Number(existingRole);

      if (existingRoleNumber !== 0) {
        setError(`This address is already registered as a ${getRoleName(existingRoleNumber)}. They don't need to be vouched for.`);
        setIsSubmitting(false);
        return;
      }

      // Check if partner already has an active partnership
      const existingPartnership = await contracts.partnershipRegistry.partnerships(partnerAddress);
      if (existingPartnership.isActive) {
        setError(`This address already has an active partnership vouched by ${existingPartnership.voucher.substring(0, 10)}...`);
        setIsSubmitting(false);
        return;
      }

      // Call the smart contract
      const tx = await contracts.partnershipRegistry.establishPartnership(
        partnerAddress,
        partnerRole
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Partnership established!');

      alert(
        `✅ Partnership Established!\n\nYou have vouched for ${partnerAddress} as a ${getRoleName(partnerRole)}.\n\nThey are now part of your trust chain and can operate in the supply chain.`
      );

      // Reset form
      setPartnerAddress('');
      setPartnerRole(2);

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err: any) {
      console.error('Error establishing partnership:', err);

      // Parse error messages from contract reverts
      let errorMessage = 'Failed to establish partnership';

      if (err.message) {
        if (err.message.includes('Partner already has active voucher')) {
          errorMessage = 'This partner already has an active voucher from another stakeholder.';
        } else if (err.message.includes('Invalid partnership hierarchy')) {
          errorMessage = `Invalid partnership hierarchy. As a ${getRoleName(myRole)}, you can only vouch for ${getAvailableRoles().map(r => r.label).join(' or ')}.`;
        } else if (err.message.includes('Manufacturer lacks verified credential')) {
          errorMessage = 'You need to have a verified credential before you can vouch for partners.';
        } else if (err.message.includes('Voucher must be verified through trust chain')) {
          errorMessage = 'You must be vouched for by an upstream partner before you can vouch for others.';
        } else if (err.message.includes('Cannot vouch for yourself')) {
          errorMessage = 'You cannot vouch for yourself.';
        } else if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          errorMessage = 'Transaction was rejected.';
        } else {
          // Show the raw error if it doesn't match any known patterns
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles = getAvailableRoles();

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
            🤝 Vouch for Partner
          </h2>
          <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
            Extend your trust chain to downstream partners
          </p>
        </div>

        {/* Verification Status */}
        <div
          style={{
            padding: '15px',
            backgroundColor: isVerified ? '#e7f5e7' : '#ffe7e7',
            border: `1px solid ${isVerified ? '#90d790' : '#ffb0b0'}`,
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{isVerified ? '✅' : '⚠️'}</span>
            <div>
              <strong style={{ color: '#333' }}>
                {isVerified ? 'Verified' : 'Not Verified'}
              </strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                Your Role: <strong>{getRoleName(myRole)}</strong>
              </p>
              {myTrustChain.length > 0 && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Trust Chain: {myTrustChain.length} level(s)
                </p>
              )}
            </div>
          </div>
        </div>

        {!isVerified && (
          <div
            style={{
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#856404',
            }}
          >
            <strong>⚠️ Verification Required</strong>
            <p style={{ margin: '8px 0 0 0' }}>
              {myRole === 1
                ? 'As a Manufacturer, you need to apply for credentials before vouching for partners.'
                : 'You need to be vouched for by an upstream partner before you can vouch for others.'}
            </p>
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
              Partner Address *
            </label>
            <input
              type="text"
              value={partnerAddress}
              onChange={(e) => setPartnerAddress(e.target.value)}
              placeholder="0x..."
              disabled={isSubmitting || !isVerified}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
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
              Partner Role *
            </label>
            <select
              value={partnerRole}
              onChange={(e) => setPartnerRole(Number(e.target.value))}
              disabled={isSubmitting || !isVerified || availableRoles.length === 0}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            >
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
              {availableRoles.length === 0 && (
                <option value={0}>No downstream roles available</option>
              )}
            </select>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {myRole === 1 && 'As a Manufacturer, you can vouch for Distributors or Pharmacies'}
              {myRole === 2 && 'As a Distributor, you can vouch for Pharmacies'}
              {myRole === 3 && 'Pharmacies typically do not vouch for downstream partners'}
            </p>
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
            <strong>🔗 Recursive Trust Chain</strong>
            <p style={{ margin: '8px 0 0 0' }}>
              When you vouch for a partner, they inherit your trust chain. This creates a verifiable
              path back to a licensed manufacturer. Your partner can then vouch for their own
              downstream partners, extending the chain of trust.
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
              disabled={
                isSubmitting ||
                !isVerified ||
                !partnerAddress ||
                availableRoles.length === 0
              }
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor:
                  isSubmitting ||
                  !isVerified ||
                  !partnerAddress ||
                  availableRoles.length === 0
                    ? '#ccc'
                    : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  isSubmitting ||
                  !isVerified ||
                  !partnerAddress ||
                  availableRoles.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: '500',
              }}
            >
              {isSubmitting ? 'Vouching...' : '🤝 Vouch for Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
