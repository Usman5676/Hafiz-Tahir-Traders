import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, Printer, DollarSign } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Loader } from '../components/ui/Loader';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Sales.css';

const Sales = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [submitting, setSubmitting] = useState(false);

  // References for printing
  const printRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers')
      ]);
      setProducts(productsRes.data);
      // Filter out 'Walk-in' from the database list if it exists to avoid duplicate with hardcoded one
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
        
        if (newQty < 1) return item; // Don't go below 1, use remove instead
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

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }

    setSubmitting(true);
    try {
      // Create Sale Record
      await api.post('/sales', {
        customer_id: selectedCustomer || null,
        sale_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        total: cartTotal
      });

      // Optional: Deduct stock from products using PUT /api/products/:id
      // (Since /api/sales only stores totals in the current backend schema)
      for (const item of cart) {
        const id = item.id || item._id;
        const currentStock = item.stock !== undefined ? item.stock : item.quantity;
        const newStock = currentStock - item.cartQty;
        
        // Make put request to update stock
        await api.put(`/products/${id}`, {
          ...item,
          quantity: newStock,
          stock: newStock
        });
      }

      toast.success('Sale completed successfully!');
      
      // Print Receipt automatically
      handlePrint();

      // Clear cart & refresh products
      setCart([]);
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
      toast.warning('Cart is empty. Add items to print receipt.');
      return;
    }
    window.print();
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="pos-container no-print">
        
        {/* Left Side: Products Grid */}
        <div className="pos-left">
          <div className="pos-header">
            <h1 className="pos-title">
              <Package size={24} color="var(--accent-primary)" />
              {t('products') || 'Products'}
            </h1>
            <div className="pos-search">
              <Search size={18} className="search-icon" />
              <input 
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
                  <th style={{ width: '40%' }}>{t('productName') || 'Product Name'}</th>
                  <th style={{ width: '15%' }}>{t('stock') || 'Stock'}</th>
                  <th style={{ width: '25%' }}>{t('price') || 'Price'}</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>{t('action') || 'Action'}</th>
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
        </div>

        {/* Right Side: Cart Sidebar */}
        <div className="pos-sidebar">
          <div className="cart-header">
            <h3><ShoppingCart size={20} /> Current Order</h3>
            <span className="cart-badge">{cart.reduce((a, b) => a + b.cartQty, 0)} items</span>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                <p>Select products to add to cart</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id || item._id} className="cart-item">
                  <div className="cart-item-top">
                    <span>{item.name}</span>
                  </div>
                  <div className="cart-item-bottom">
                    <span className="cart-item-price">Rs. {((item.price || 0) * item.cartQty).toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateCartQty(item.id || item._id, -1)}><Minus size={14}/></button>
                        <span className="qty-val">{item.cartQty}</span>
                        <button className="qty-btn" onClick={() => updateCartQty(item.id || item._id, 1)}><Plus size={14}/></button>
                      </div>
                      <button className="remove-btn" onClick={() => removeFromCart(item.id || item._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="settings-group">
              <label className="settings-label"><User size={14} /> Customer (Optional)</label>
              <select 
                className="customer-select" 
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="settings-group">
              <label className="settings-label"><CreditCard size={14} /> Payment Method</label>
              <div className="payment-methods">
                {['Cash', 'Card', 'Online'].map(method => (
                  <div 
                    key={method}
                    className={`payment-method ${paymentMethod === method ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <label className="settings-label"><DollarSign size={14} /> Discount</label>
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

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>- Rs. {discountAmount.toLocaleString()}</span>
              </div>
              <div className="cart-total">
                <span>Total:</span>
                <span>Rs. {cartTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="checkout-actions">
              <button className="print-receipt-btn" onClick={handlePrint} title="Print Receipt">
                <Printer size={20} />
              </button>
              <button 
                className="complete-sale-btn" 
                onClick={handleCompleteSale}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? <Loader /> : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
