import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext } from './context/AuthContext';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import LowStock from './pages/LowStock';
import SystemUsers from './pages/SystemUsers';

// --- Protected Route Helper ---
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; 

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role?.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <LanguageProvider>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Authenticated Routes with Role Protection */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/customers" element={<Customers />} />
              
              {/* Manager & Admin Only */}
              <Route path="/purchases" element={<ProtectedRoute roles={['admin', 'manager']}><Purchases /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute roles={['admin', 'manager']}><Suppliers /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['admin', 'manager']}><Reports /></ProtectedRoute>} />
              <Route path="/low-stock" element={<ProtectedRoute roles={['admin', 'manager']}><LowStock /></ProtectedRoute>} />
              
              {/* Admin Only */}
              <Route path="/system-users" element={<ProtectedRoute roles={['admin']}><SystemUsers /></ProtectedRoute>} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer position="top-right" theme="colored" />
      </AuthProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;