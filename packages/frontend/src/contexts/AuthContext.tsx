/**
 * @file Auth Context Provider
 * @description Manages user authentication and role-based access control
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useWeb3 } from './Web3Context';
import { StakeholderRole } from '../types';
import type { StakeholderRoleType } from '../types';
import { ROLE_NAMES } from '../config';

interface AuthContextType {
  role: StakeholderRoleType;
  roleName: string;
  isLoading: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { account, stakeholderRegistry, isConnected } = useWeb3();
  const [role, setRole] = useState<StakeholderRoleType>(StakeholderRole.None);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch the user's role from the StakeholderRegistry contract
   */
  const fetchRole = async () => {
    if (!account || !stakeholderRegistry || !isConnected) {
      setRole(StakeholderRole.None);
      return;
    }

    setIsLoading(true);
    try {
      const userRole = await stakeholderRegistry.getRole(account);
      const roleValue = Number(userRole) as StakeholderRoleType;
      setRole(roleValue);
      console.log('✅ User role fetched:', ROLE_NAMES[roleValue]);
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      setRole(StakeholderRole.None);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh role when account or contract changes
   */
  useEffect(() => {
    fetchRole();
  }, [account, stakeholderRegistry, isConnected]);

  const value: AuthContextType = {
    role,
    roleName: ROLE_NAMES[role] || 'Unknown',
    isLoading,
    refreshRole: fetchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access Auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
