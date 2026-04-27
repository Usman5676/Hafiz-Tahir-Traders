import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';

const CompactOrderItem = ({ item, onIncrease, onDecrease, onRemove }) => {
  const stockAvailable = item.stock !== undefined ? item.stock : item.quantity;
  const price = Number(item.sell_price || 0);
  const total = price * item.cartQty;

  return (
    <motion.div 
      className="compact-order-item"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      layout
    >
      <div className="coi-details">
        <div className="coi-name">
          {item.name} {item.cartQty >= stockAvailable && <span className="coi-max-badge">(Max)</span>}
        </div>
        <div className="coi-calc">
          Rs. {price.toLocaleString()} × {item.cartQty} = <span className="coi-total">Rs. {total.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="coi-actions">
        <div className="coi-qty-controls">
          <button onClick={() => onDecrease(item.id || item._id)}><Minus size={12} strokeWidth={3} /></button>
          <span>{item.cartQty}</span>
          <button onClick={() => onIncrease(item.id || item._id)} disabled={item.cartQty >= stockAvailable}><Plus size={12} strokeWidth={3} /></button>
        </div>
        <button className="coi-remove" onClick={() => onRemove(item.id || item._id)}>
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
};

export default CompactOrderItem;
