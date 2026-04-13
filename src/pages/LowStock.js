import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Loader } from '../components/ui/Loader';
import { useTranslation } from '../context/LanguageContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Dashboard.css';

const LowStock = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
=======
  const [sendingAlert, setSendingAlert] = useState(false);
>>>>>>> c99f2aa (gg)

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await api.get('/products');
        const products = Array.isArray(res.data) ? res.data : [];
        const lowStock = products.filter(
          (p) => (p.quantity !== undefined ? p.quantity : p.stock) < 10
        );
        setItems(lowStock);
      } catch (err) {
        toast.error('Failed to load low stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchLowStock();
  }, []);

<<<<<<< HEAD
=======
  const handleSendAlert = async () => {
    setSendingAlert(true);
    try {
      const res = await api.post('/send-sms-alert');
      if (res.data && res.data.message) {
        toast.success(res.data.message);
      } else {
        toast.success('SMS Alert request sent successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send SMS Alert.');
      console.error(err);
    } finally {
      setSendingAlert(false);
    }
  };

>>>>>>> c99f2aa (gg)
  const columns = [
    { header: t('id'), accessor: 'id' },
    { header: t('productName'), accessor: 'name', cell: (row) => row.name || 'Unnamed' },
    {
      header: t('currentStock'),
      accessor: 'quantity',
      cell: (row) => {
        const qty = row.quantity !== undefined ? row.quantity : row.stock;
        return (
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
            {qty}
          </span>
        );
      },
    },
    {
      header: t('status'),
      cell: (row) => {
        const qty = row.quantity !== undefined ? row.quantity : row.stock;
        return (
          <span
            style={{
              background: qty <= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
              color: qty <= 3 ? 'var(--danger)' : 'var(--warning)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            {qty <= 3 ? t('critical') : t('low')}
          </span>
        );
      },
    },
  ];

  return (
    <div className="page-container">
<<<<<<< HEAD
      <header className="page-header">
=======
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
>>>>>>> c99f2aa (gg)
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={28} color="var(--danger)" />
            {t('lowStockTitle')}
          </h1>
          <p className="page-subtitle">{t('lowStockSubtitle')}</p>
        </div>
<<<<<<< HEAD
=======
        <button 
          onClick={handleSendAlert}
          disabled={sendingAlert || items.length === 0}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: (sendingAlert || items.length === 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: (sendingAlert || items.length === 0) ? 0.7 : 1
          }}
        >
          {sendingAlert ? <Loader size={16} color="white" /> : <AlertTriangle size={16} />}
          {sendingAlert ? 'Sending...' : 'Send Twilio SMS Alert'}
        </button>
>>>>>>> c99f2aa (gg)
      </header>

      {loading ? (
        <Card><Loader /></Card>
      ) : items.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
            <p>{t('allProductsWellStocked')}</p>
          </div>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Table columns={columns} data={items} />
        </motion.div>
      )}
    </div>
  );
};

export default LowStock;
