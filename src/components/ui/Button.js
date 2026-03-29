import React from 'react';
import { motion } from 'framer-motion';
import './UI.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  isLoading, 
  ...props 
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`btn btn-${variant} btn-${size} ${className} ${isLoading ? 'loading' : ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="spinner"></span> : children}
    </motion.button>
  );
};
