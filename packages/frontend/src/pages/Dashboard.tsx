/**
 * @file Dashboard Page
 * @description Main dashboard with role-based UI rendering
 */

import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { StakeholderRole } from '../types';
import { ManufacturerDashboard } from '../components/Manufacturer/ManufacturerDashboard';
import { DistributorDashboard } from '../components/Distributor/DistributorDashboard';
import { PharmacistDashboard } from '../components/Pharmacist/PharmacistDashboard';

export function Dashboard() {
  const { account, isConnected, connectWallet, network } = useWeb3();
  const { role, roleName, isLoading } = useAuth();

  // Not connected
  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1>Welcome to MedTrace</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          Blockchain-based Pharmaceutical Supply Chain Tracking
        </p>
        <button
          onClick={connectWallet}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Connect Wallet
        </button>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
          Please connect your MetaMask wallet to continue
        </p>
      </div>
    );
  }

  // Loading role
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Loading your role...</h2>
      </div>
    );
  }

  // No role assigned
  if (role === StakeholderRole.None) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>No Role Assigned</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Your wallet address is not registered in the StakeholderRegistry.
        </p>
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <p>
            <strong>Your Address:</strong>
          </p>
          <code style={{ fontSize: '14px', wordBreak: 'break-all' }}>{account}</code>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Please contact the system administrator to register your address with a role
            (Manufacturer, Distributor, or Pharmacist).
          </p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  return (
    <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '20px', minHeight: 'calc(100vh - 200px)', boxSizing: 'border-box' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#007bff' }}>{roleName}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Network: {network?.name}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
          </p>
        </div>
      </div>

      {/* Role-specific content with min-height container */}
      <div style={{ minHeight: '600px' }}>
        {role === StakeholderRole.Manufacturer && <ManufacturerDashboard />}
        {role === StakeholderRole.Distributor && <DistributorDashboard />}
        {role === StakeholderRole.Pharmacist && <PharmacistDashboard />}
      </div>
    </div>
  );
}
