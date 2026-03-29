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

const Suppliers = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id || item._id);
      setFormData({ 
        name: item.name || '', 
        phone: item.phone || '', 
        email: item.email || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', phone: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.warning('Name and Phone are required');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.warning('Please enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added');
      }
      closeModal();
      fetchItems();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this supplier?')) {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success('Supplier deleted');
        fetchItems();
      } catch (error) {
        toast.error('Failed to delete supplier');
      }
    }
  };

  const columns = [
    { header: t('id'), accessor: 'id', cell: (row) => row.id || row._id || '-' },
    { header: t('name'), accessor: 'name' },
    { header: t('contact'), accessor: 'phone', cell: (row) => row.phone || '-' },
    { header: t('email'), accessor: 'email', cell: (row) => row.email || '-' },
    {
      header: t('actions'),
      cell: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => openModal(row)}>
            <Edit2 size={16} />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(row.id || row._id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('suppliers')}</h1>
          <p className="page-subtitle">{t('manageSuppliers')}</p>
        </div>
        <Button onClick={() => openModal()} className="glass">
          <Plus size={20} /> {t('addSupplier')}
        </Button>
      </header>

      {loading ? (
        <Card><Loader /></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Table columns={columns} data={items} />
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
                  <h3>{editingId ? t('editSupplier') : t('addNewSupplier')}</h3>
                  <button onClick={closeModal} className="icon-btn"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <Input 
                    label={t('supplierName')} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <Input 
                    label={t('phone')} 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                  <Input 
                    type="email"
                    label={t('emailAddress')} 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
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

export default Suppliers;
