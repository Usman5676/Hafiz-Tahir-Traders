import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, ShoppingCart, Plus } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Loader } from '../components/ui/Loader';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';

import CompactOrderItem from '../components/pos/CompactOrderItem';
import CustomerHeader from '../components/pos/CustomerHeader';
import PaymentSection from '../components/pos/PaymentSection';
import OrderSummary from '../components/pos/OrderSummary';
import StepIndicator from '../components/pos/StepIndicator';
import ConfirmationModal from '../components/pos/ConfirmationModal';

import './Sales.css';

const Sales = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // POS State
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [submitting, setSubmitting] = useState(false);
  const [manualPaidAmount, setManualPaidAmount] = useState('');

  // References

  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchData();
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 100);
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If modal is open (step 3), ignore keyboard from here, let modal handle it via auto-focus
      if (currentStep === 3) return;

      if (e.key === 'Enter') {
        if (currentStep === 1 && cart.length > 0) {
          setCurrentStep(2);
        } else if (currentStep === 2) {
          handleNextToConfirm();
        }
      }
      
      if (e.key === 'Escape' && currentStep === 2) {
        setCurrentStep(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cart, paymentMethod, selectedCustomer]);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers')
      ]);
      setProducts(productsRes.data);
      const manualCustomers = customersRes.data.filter(c => 
        c.name?.toLowerCase() !== 'walk-in customer' && 
        c.name?.toLowerCase() !== 'walk-in'
      );
      setCustomers(manualCustomers);
    } catch (error) {
      toast.error('Failed to load products or customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product) => {
    const existing = cart.find(item => (item.id || item._id) === (product.id || product._id));
    const stockAvailable = product.stock !== undefined ? product.stock : product.quantity;

    if (existing) {
      if (existing.cartQty >= stockAvailable) {
        toast.warning(`Only ${stockAvailable} items available in stock!`);
        return;
      }
      setCart(cart.map(item => 
        (item.id || item._id) === (product.id || product._id)
          ? { ...item, cartQty: item.cartQty + 1 }
          : item
      ));
    } else {
      if (stockAvailable <= 0) {
        toast.warning('Product is out of stock!');
        return;
      }
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  };

  const updateCartQty = (productId, delta) => {
    setCart(cart.map(item => {
      if ((item.id || item._id) === productId) {
        const stockAvailable = item.stock !== undefined ? item.stock : item.quantity;
        const newQty = item.cartQty + delta;
        
        if (newQty < 1) return item; 
        if (newQty > stockAvailable) {
          toast.warning(`Only ${stockAvailable} items available!`);
          return item;
        }
        return { ...item, cartQty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => (item.id || item._id) !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.cartQty), 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * (Number(discountValue) / 100)) 
    : Number(discountValue);
  const cartTotal = Math.max(0, subtotal - discountAmount);

  const handleNextToConfirm = () => {
    if ((paymentMethod === 'Partial' || paymentMethod === 'Credit') && !selectedCustomer) {
      toast.error('Customer is mandatory for Partial or Credit sales!');
      return;
    }
    if (paymentMethod === 'Partial' && Number(manualPaidAmount) >= cartTotal) {
      toast.warning('Paid amount should be strictly less than total. Use Cash if paying in full.');
      return;
    }
    setCurrentStep(3);
  };

  const handleCompleteSale = async () => {
    let finalPaidAmount = cartTotal;
    if (paymentMethod === 'Partial') {
      finalPaidAmount = Number(manualPaidAmount) || 0;
    } else if (paymentMethod === 'Credit') {
      finalPaidAmount = 0;
    }

    setSubmitting(true);
    try {
      await api.post('/sales', {
        customer_id: selectedCustomer || null,
        sale_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        total: cartTotal,
        payment_type: paymentMethod,
        paid_amount: finalPaidAmount
      });

      for (const item of cart) {
        const id = item.id || item._id;
        const currentStock = item.stock !== undefined ? item.stock : item.quantity;
        const newStock = currentStock - item.cartQty;
        await api.put(`/products/${id}`, {
          ...item,
          quantity: newStock,
          stock: newStock
        });
      }

      toast.success('Sale completed successfully!');
      
      handlePrint();

      // Reset
      setCart([]);
      setCurrentStep(1);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (cart.length === 0) {
      return;
    }
    window.print();
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="pos-master-wrapper no-print">
        <StepIndicator currentStep={currentStep} />
        
        <div className="pos-container">
          
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pos-left"
              >
                <div className="pos-header">
                  <h1 className="pos-title">
                    <Package size={24} color="var(--accent-primary)" />
                    {t('sidebar.products')}
                  </h1>
                  <div className="pos-search">
                    <Search size={18} className="search-icon" />
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search products..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>{t('products.productName')}</th>
                        <th style={{ width: '15%' }}>{t('products.stock')}</th>
                        <th style={{ width: '25%' }}>{t('products.price')}</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>{t('products.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => {
                        const stock = product.stock !== undefined ? product.stock : product.quantity;
                        const price = product.price || 0;
                        const isLowStock = stock <= 5 && stock > 0;
                        const isOutOfStock = stock <= 0;

                        return (
                          <tr 
                            key={product.id || product._id} 
                            className={`product-row ${isOutOfStock ? 'out-of-stock' : ''}`}
                            onClick={() => !isOutOfStock && addToCart(product)}
                          >
                            <td>
                              <div className="product-name-cell">
                                <span className="product-name-text">{product.name}</span>
                                {isLowStock && <span className="badge badge-warning">Low Stock</span>}
                                {isOutOfStock && <span className="badge badge-danger">Out of Stock</span>}
                              </div>
                            </td>
                            <td>
                              <span className={`stock-level ${isLowStock ? 'text-warning' : isOutOfStock ? 'text-danger' : 'text-success'}`}>
                                {stock}
                              </span>
                            </td>
                            <td className="price-cell">
                              Rs. {Number(price).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="add-to-cart-btn" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                disabled={isOutOfStock}
                                title={isOutOfStock ? 'Out of Stock' : 'Add to Order'}
                              >
                                <Plus size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && (
                    <div className="no-results">
                      <Search size={40} style={{ opacity: 0.1, marginBottom: '10px' }} />
                      <p>No products found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep >= 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="pos-payment-step"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{margin: 0, fontSize: '1.4rem'}}>Payment Setup</h2>
                  <button 
                    onClick={() => setCurrentStep(1)}
                    className="pos-back-btn"
                  >
                    🔙 Back to Products
                  </button>
                </div>

                <CustomerHeader 
                  customers={customers}
                  selectedCustomerId={selectedCustomer}
                  onSelect={setSelectedCustomer}
                />

                <div style={{ marginTop: '20px' }}>
                  <PaymentSection 
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    manualPaidAmount={manualPaidAmount}
                    setManualPaidAmount={setManualPaidAmount}
                    cartTotal={cartTotal}
                  />
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div className="pos-payment-section">
                    <label className="pos-section-label">Discount & Extras</label>
                    <div className="discount-input-group">
                      <input 
                        type="number" 
                        className="discount-input" 
                        value={discountValue} 
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                      <div className="discount-type-toggle">
                        <button 
                          className={`type-btn ${discountType === 'percentage' ? 'active' : ''}`}
                          onClick={() => setDiscountType('percentage')}
                        >%</button>
                        <button 
                          className={`type-btn ${discountType === 'fixed' ? 'active' : ''}`}
                          onClick={() => setDiscountType('fixed')}
                        >Rs</button>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Right Side: Cart Sidebar (Always Visible) */}
          <div className="pos-sidebar">
            <div className="pos-cart-header">
              <h3>Current Order ({cart.reduce((a, b) => a + b.cartQty, 0)} items)</h3>
            </div>
            <div className="pos-cart-list">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <div className="cart-empty-state">
                    <ShoppingCart size={48} className="empty-icon" />
                    <p>👉 No products added</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <CompactOrderItem 
                      key={item.id || item._id}
                      item={item}
                      onIncrease={id => updateCartQty(id, 1)}
                      onDecrease={id => updateCartQty(id, -1)}
                      onRemove={removeFromCart}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="pos-cart-footer">
              <OrderSummary 
                subtotal={subtotal}
                discountAmount={discountAmount}
                cartTotal={cartTotal}
                paymentMethod={paymentMethod}
                manualPaidAmount={manualPaidAmount}
                currentStep={currentStep}
                onNextStep={currentStep === 1 ? () => setCurrentStep(2) : handleNextToConfirm}
                submitting={submitting}
                cartLength={cart.length}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {currentStep === 3 && (
          <ConfirmationModal 
            cart={cart}
            cartTotal={cartTotal}
            paymentMethod={paymentMethod}
            manualPaidAmount={manualPaidAmount}
            selectedCustomerName={selectedCustomer ? customers.find(c => (c.id || c._id)?.toString() === selectedCustomer)?.name : ''}
            onConfirm={handleCompleteSale}
            onCancel={() => setCurrentStep(2)}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      {/* --- Print Only Receipt Component --- */}
      <div id="receipt">
        <div className="print-header">
          <h2>Hafiz Tahir Traders</h2>
          <p>Inventory Management System</p>
          <p>Contact: 0321-1234567</p>
        </div>

        <div className="print-details">
          <div><span>Date:</span> <span>{new Date().toLocaleString()}</span></div>
          <div><span>Payment:</span> <span>{paymentMethod}</span></div>
          <div><span>Customer:</span> <span>{selectedCustomer ? customers.find(c => (c.id || c._id)?.toString() === selectedCustomer)?.name : 'Walk-in Customer'}</span></div>
        </div>

        <div className="print-items">
          <div className="print-item-header">
            <span style={{flex: 2}}>Item</span>
            <span style={{flex: 1, textAlign: 'center'}}>Qty</span>
            <span style={{flex: 1, textAlign: 'right'}}>Price</span>
          </div>
          {cart.map((item, idx) => (
            <div key={idx} className="print-item">
              <span style={{flex: 2}}>{item.name}</span>
              <span style={{flex: 1, textAlign: 'center'}}>{item.cartQty}</span>
              <span style={{flex: 1, textAlign: 'right'}}>{((item.price || 0) * item.cartQty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="print-total-section">
          <div className="print-total-row">
            <span>Subtotal:</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="print-total-row">
              <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'}):</span>
              <span>- Rs. {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="print-total-row print-grand-total">
            <span>TOTAL:</span>
            <span>Rs. {cartTotal.toLocaleString()}</span>
          </div>
          {paymentMethod === 'Partial' && (
            <>
              <div className="print-total-row">
                <span>Paid Amount:</span>
                <span>Rs. {Number(manualPaidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="print-total-row">
                <span>Remaining Due:</span>
                <span>Rs. {Math.max(0, cartTotal - Number(manualPaidAmount || 0)).toLocaleString()}</span>
              </div>
            </>
          )}
          {paymentMethod === 'Credit' && (
            <div className="print-total-row">
              <span>Amount Due:</span>
              <span>Rs. {cartTotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="print-footer">
          <p>Thank You</p>
          <p>Developed by mani digital</p>
        </div>
      </div>
    </>
  );
};

export default Sales;
