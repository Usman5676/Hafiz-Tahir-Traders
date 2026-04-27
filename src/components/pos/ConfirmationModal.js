import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const ConfirmationModal = ({
  cart,
  cartTotal,
  paymentMethod,
  manualPaidAmount,
  selectedCustomerName,
  onConfirm,
  onCancel,
  submitting
}) => {
  const confirmBtnRef = useRef(null);

  // Auto focus confirm button upon load
  useEffect(() => {
    setTimeout(() => {
      if (confirmBtnRef.current) confirmBtnRef.current.focus();
    }, 100);
  }, []);

  const paid = (paymentMethod === 'Partial') ? (Number(manualPaidAmount) || 0) : cartTotal;
  const advance = paymentMethod === 'Partial' ? paid : 0;
  const remaining = paymentMethod === 'Credit' ? cartTotal : (paymentMethod === 'Partial' ? Math.max(0, cartTotal - paid) : 0);

  return (
    <div className="pos-modal-overlay">
      <motion.div 
        className="pos-modal-content"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
      >
        <h2 className="mod-title">Confirm Sale</h2>
        
        <div className="mod-info">
          <div><strong>Customer:</strong> {selectedCustomerName || 'Walk-in Customer'}</div>
          <div><strong>Payment:</strong> {paymentMethod}</div>
        </div>

        <div className="mod-items">
          <div className="mod-header"><span>Items:</span></div>
          {cart.map((item, i) => (
             <div key={i} className="mod-item-row">
               <span>- {item.name} x{item.cartQty}</span>
               <span>= {(item.cartQty * (item.sell_price || 0)).toLocaleString()}</span>
             </div>
          ))}
        </div>

        <div className="mod-totals">
          <div className="mod-tot-row"><span>Total:</span> <span>Rs. {cartTotal.toLocaleString()}</span></div>
          {paymentMethod === 'Partial' && (
            <>
              <div className="mod-tot-row"><span>Paid:</span> <span className="text-success-bold">Rs. {advance.toLocaleString()}</span></div>
              <div className="mod-tot-row"><span>Remaining:</span> <span className="text-danger-bold">Rs. {remaining.toLocaleString()}</span></div>
            </>
          )}
          {paymentMethod === 'Credit' && (
            <div className="mod-tot-row"><span>Remaining:</span> <span className="text-danger-bold">Rs. {remaining.toLocaleString()}</span></div>
          )}
        </div>

        <div className="mod-actions">
          <button className="mod-btn cancel" onClick={onCancel} disabled={submitting}>Cancel ❌</button>
          <button 
            ref={confirmBtnRef}
            className="mod-btn confirm" 
            onClick={onConfirm} 
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Confirm Sale ✅'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmationModal;
