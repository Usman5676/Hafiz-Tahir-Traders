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

const Customers = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      console.log('Fetched Customers:', res.data);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load customers');
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
        email: item.email || '', 
        phone: item.phone || item.contact || '',
        address: item.address || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
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
    console.log('Submitting Customer Data:', formData);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer added');
      }
      closeModal();
      fetchItems();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this customer?')) {
      try {
        await api.delete(`/customers/${id}`);
        toast.success('Customer deleted');
        fetchItems();
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Failed to delete customer';
        console.error('Delete Error:', error);
        toast.error(errorMsg);
      }
    }
  };

  const columns = [
    { header: t('products.id'), accessor: 'id', cell: (row) => row.id || row._id || '-' },
    { header: t('customers.customerName'), accessor: 'name' },
    { header: t('suppliers.email'), accessor: 'email', cell: (row) => row.email || '-' },
    { header: t('customers.phone'), accessor: 'phone', cell: (row) => row.phone || row.contact || '-' },
    { header: t('customers.address'), accessor: 'address', cell: (row) => row.address || '-' },
    {
      header: t('products.actions'),
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
          <h1 className="page-title">{t('sidebar.customers')}</h1>
          <p className="page-subtitle">{t('customers.manageCustomers')}</p>
        </div>
        <Button onClick={() => openModal()} className="glass">
          <Plus size={20} /> {t('customers.addCustomer')}
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
                  <h3>{editingId ? t('customers.editCustomer') : t('customers.addNewCustomer')}</h3>
                  <button onClick={closeModal} className="icon-btn"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <Input 
                    label={t('customers.customerName')} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <Input 
                    type="email"
                    label={t('systemUsers.emailAddress')} 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                  <Input 
                    label={t('customers.phoneNumber')} 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                  <Input 
                    label={t('customers.physicalAddress')} 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button type="button" variant="secondary" onClick={closeModal}>{t('products.cancel')}</Button>
                    <Button type="submit" isLoading={submitting}>{editingId ? t('products.update') : t('products.save')}</Button>
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

export default Customers;
