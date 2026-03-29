import React, { useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useContext(AuthContext);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully logged in');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-wrapper"
      >
        <Card className="login-card">
          <div className="login-header">
            <h1 className="brand-logo" style={{ fontSize: '1.8rem', lineHeight: '1.2', marginBottom: '15px', color: '#1e293b' }}>
              Hafiz Tahir <span className="accent" style={{ color: '#fbbf24' }}>Traders</span>
            </h1>
            <p className="subtitle" style={{ fontWeight: '500', opacity: 0.8 }}>Inventory Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-4" 
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;