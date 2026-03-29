import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { useTranslation } from '../context/LanguageContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id || product._id);
      setFormData({ 
        name: product.name || '', 
        price: product.price || '', 
        stock: product.stock !== undefined ? product.stock : product.quantity || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', price: '', stock: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || formData.stock === '') {
      toast.warning('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, formData);
        toast.success('Product updated');
      } else {
        await api.post('/products', formData);
        toast.success('Product added');
      }
      closeModal();
      fetchProducts();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Product deleted');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const columns = [
    { header: t('id'), accessor: 'id', cell: (row) => row.id || row._id || 'N/A' },
    { header: t('name'), accessor: 'name' },
    { header: t('price'), accessor: 'price', cell: (row) => `Rs. ${row.price?.toLocaleString() || 0}` },
    { 
      header: t('stock'), 
      accessor: 'stock', 
      cell: (row) => {
        const val = row.stock !== undefined ? row.stock : row.quantity;
        return (
          <span style={{ color: val < 10 ? 'var(--danger)' : 'inherit', fontWeight: val < 10 ? 600 : 400 }}>
            {val}
          </span>
        );
      }
    },
    {
      header: t('actions'),
      cell: (row) => {
        const val = row.stock !== undefined ? row.stock : row.quantity;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {val < 10 && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => openModal(row)}
                title="Restock Item"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                <Plus size={16} />
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => openModal(row)}>
              <Edit2 size={16} />
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(row.id || row._id)}>
              <Trash2 size={16} />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('products')}</h1>
          <p className="page-subtitle">{t('manageProducts')}</p>
        </div>
        <Button onClick={() => openModal()} className="glass">
          <Plus size={20} /> {t('addProduct')}
        </Button>
      </header>

      {loading ? (
        <Card><Loader /></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Table columns={columns} data={products} />
        </motion.div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3>{editingId ? t('editProduct') : t('addNewProduct')}</h3>
                  <button onClick={closeModal} className="icon-btn"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <Input 
                    label={t('productName')} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <Input 
                    type="number"
                    label={t('price')} 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                  />
                  <Input 
                    type="number"
                    label={t('stockQuantity')} 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button type="button" variant="secondary" onClick={closeModal}>{t('cancel')}</Button>
                    <Button type="submit" isLoading={submitting}>{editingId ? t('update') : t('save')}</Button>
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

export default Products;
