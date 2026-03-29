import React from 'react';
import './UI.css';

export const Loader = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: 'var(--accent-primary)', borderColor: 'var(--border-color)' }}></div>
      </div>
    );
  }
  
  return (
    <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }}></div>
  );
};

export const Skeleton = ({ className = '', height = '20px', width = '100%', borderRadius = 'var(--radius)' }) => {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ height, width, borderRadius }} 
    />
  );
};
