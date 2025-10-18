/**
 * @file Main Application Component
 * @description Root component with routing and context providers
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider } from './contexts/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { VerifyBatch } from './pages/VerifyBatch';
import { NavBar } from './components/common/NavBar';
import './App.css';

function App() {
  return (
    <Router>
      <Web3Provider>
        <AuthProvider>
          <div className="app">
            {/* Navigation */}
            <NavBar />

            {/* Routes */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/verify" element={<VerifyBatch />} />
            </Routes>

            {/* Footer */}
            <footer
              style={{
                textAlign: 'center',
                padding: '20px',
                marginTop: '40px',
                color: '#666',
                borderTop: '1px solid #dee2e6',
              }}
            >
              <p>
                MedTrace - Blockchain-based Pharmaceutical Supply Chain Tracking
              </p>
              <p style={{ fontSize: '14px' }}>
                Built with React, TypeScript, ethers.js, and Solidity
              </p>
            </footer>
          </div>
        </AuthProvider>
      </Web3Provider>
    </Router>
  );
}

export default App;
