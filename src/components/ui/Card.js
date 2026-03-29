import React from 'react';
import { motion } from 'framer-motion';
import './UI.css';

export const Card = ({ children, className = '', hoverable = false, ...props }) => {
  const Component = hoverable ? motion.div : 'div';
  const hoverProps = hoverable ? {
    whileHover: { y: -5, scale: 1.01 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component 
      className={`card glass ${className}`} 
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
};
