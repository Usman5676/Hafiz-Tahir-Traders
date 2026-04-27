import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';

const OrderItemCard = ({ item, onIncrease, onDecrease, onRemove }) => {
  const stockAvailable = item.stock !== undefined ? item.stock : item.quantity;
  const price = Number(item.sell_price || 0);
  const total = price * item.cartQty;

  return (
    <motion.div 
      className="order-item-card"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 50 }}
      layout
    >
      <div className="oic-top">
        <span className="oic-name">{item.name} {item.cartQty >= stockAvailable && <span className="oic-max-badge">(Max)</span>}</span>
        <button className="oic-remove" onClick={() => onRemove(item.id || item._id)} title="Remove Item">
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
      
      <div className="oic-price-row">
        <span>Price: Rs. {price.toLocaleString()}</span>
      </div>

      <div className="oic-bottom">
        <div className="oic-qty-group">
          <span className="oic-label">Qty:</span>
          <div className="oic-controls">
            <button onClick={() => onDecrease(item.id || item._id)}><Minus size={14}/></button>
            <span className="oic-qty-badge">{item.cartQty}</span>
            <button onClick={() => onIncrease(item.id || item._id)} disabled={item.cartQty >= stockAvailable}><Plus size={14}/></button>
          </div>
        </div>
        
        <div className="oic-total-group">
          <span className="oic-total-text">Total: </span>
          <span className="oic-total-amt">Rs. {total.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderItemCard;
