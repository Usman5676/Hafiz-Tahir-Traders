import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { useTranslation } from '../context/LanguageContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ productId: '', quantity: '', cost: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchRes, prodRes] = await Promise.all([
        api.get('/purchases').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] }))
      ]);
      setPurchases(Array.isArray(purchRes.data) ? purchRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity) {
      toast.warning('Product and Quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/purchases', formData);
      toast.success('Stock purchase recorded successfully');
      setIsModalOpen(false);
      setFormData({ productId: '', quantity: '', cost: '' });
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this purchase record?')) {
      try {
        await api.delete(`/purchases/${id}`);
        toast.success('Purchase deleted');
        setPurchases(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to delete purchase');
      }
    }
  };

  const columns = [
    { header: t('purchaseId'), accessor: 'id', cell: (row) => `#${row.id}` },
    { 
      header: t('product'), 
      cell: (row) => row.product_name || `Product #${row.product_id}` || '-'
    },
    { header: t('qtyAdded'), accessor: 'quantity' },
    { 
      header: t('costRs'), 
      cell: (row) => `Rs. ${Number(row.price || 0).toLocaleString()}`
    },
    { 
      header: t('date'), 
      cell: (row) => row.purchase_date 
        ? new Date(row.purchase_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
        : '-'
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
          <Trash2 size={15} />
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('purchasesTitle')}</h1>
          <p className="page-subtitle">{t('managePurchases')}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="glass">
          <Plus size={20} /> {t('recordPurchase')}
        </Button>
      </header>

      {loading ? (
        <Card><Loader /></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Table columns={columns} data={purchases} />
        </motion.div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3>{t('recordStockPurchase')}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="icon-btn"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="input-wrapper">
                    <label className="input-label">{t('selectProduct')}</label>
                    <select 
                      className="input-field" 
                      value={formData.productId}
                      onChange={e => setFormData({...formData, productId: e.target.value})}
                    >
                      <option value="">{t('chooseRestock')}</option>
                      {products.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input 
                    type="number"
                    label={t('quantityToAdd')} 
                    value={formData.quantity} 
                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  />
                  <Input 
                    type="number"
                    label={t('totalCost')} 
                    value={formData.cost} 
                    onChange={e => setFormData({...formData, cost: e.target.value})} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                    <Button type="submit" isLoading={submitting}>{t('submitPurchase')}</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Purchases;
