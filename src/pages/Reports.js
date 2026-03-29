import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Loader } from '../components/ui/Loader';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { BarChart2, Package, ShoppingCart, Download, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import './Dashboard.css';
import './Reports.css';

const Reports = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [exportingInv, setExportingInv] = useState(false);
  const [exportingSales, setExportingSales] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, salesRes] = await Promise.all([
        api.get('/reports/inventory').catch(() => ({ data: [] })),
        api.get('/reports/sales').catch(() => ({ data: [] })),
      ]);
      setInventoryData(Array.isArray(invRes.data) ? invRes.data : []);
      setSalesData(Array.isArray(salesRes.data) ? salesRes.data : []);
    } catch (err) {
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportInventory = async () => {
    setExportingInv(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reports/inventory/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Inventory report exported successfully!');
    } catch (err) {
      toast.error('Failed to export inventory report');
    } finally {
      setExportingInv(false);
    }
  };

  const handleExportSales = async () => {
    setExportingSales(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reports/sales/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Sales report exported successfully!');
    } catch (err) {
      toast.error('Failed to export sales report');
    } finally {
      setExportingSales(false);
    }
  };

  const totalRevenue = salesData.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalProducts = inventoryData.length;
  const lowStockCount = inventoryData.filter(p => (p.stock !== undefined ? p.stock : p.quantity) < 10).length;

  const inventoryCols = [
    { header: 'ID', accessor: 'id', cell: (row) => row.id || '-' },
    { header: 'Product Name', accessor: 'name' },
    { header: 'Price (Rs.)', cell: (row) => `Rs. ${Number(row.price || 0).toLocaleString()}` },
    {
      header: 'Stock',
      cell: (row) => {
        const val = row.stock !== undefined ? row.stock : (row.quantity || 0);
        return (
          <span className={`stock-badge ${val < 10 ? 'stock-low' : 'stock-ok'}`}>
            {val} {val < 10 ? '⚠️' : '✓'}
          </span>
        );
      }
    },
    {
      header: 'Status',
      cell: (row) => {
        const val = row.stock !== undefined ? row.stock : (row.quantity || 0);
        return (
          <span className={`status-pill ${val === 0 ? 'pill-danger' : val < 10 ? 'pill-warning' : 'pill-success'}`}>
            {val === 0 ? 'Out of Stock' : val < 10 ? 'Low Stock' : 'In Stock'}
          </span>
        );
      }
    }
  ];

  const salesCols = [
    { header: 'Sale ID', accessor: 'id', cell: (row) => `#${row.id}` },
    { header: 'Customer', accessor: 'customer_name', cell: (row) => row.customer_name || 'Walk-in' },
    { header: 'Total (Rs.)', cell: (row) => `Rs. ${Number(row.total || 0).toLocaleString()}` },
    {
      header: 'Date',
      cell: (row) => row.sale_date
        ? new Date(row.sale_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
        : '-'
    }
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">System Reports</h1>
          <p className="page-subtitle">View and export your business data</p>
        </div>
        <Button onClick={fetchData} variant="secondary" className="glass">
          <RefreshCw size={18} /> Refresh
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="reports-summary-grid">
        <motion.div className="report-stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="report-stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><Package size={22} /></div>
          <div>
            <p className="report-stat-label">Total Products</p>
            <h3 className="report-stat-value">{totalProducts}</h3>
          </div>
        </motion.div>
        <motion.div className="report-stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="report-stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><BarChart2 size={22} /></div>
          <div>
            <p className="report-stat-label">Total Revenue</p>
            <h3 className="report-stat-value">Rs. {totalRevenue.toLocaleString()}</h3>
          </div>
        </motion.div>
        <motion.div className="report-stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="report-stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}><ShoppingCart size={22} /></div>
          <div>
            <p className="report-stat-label">Total Sales</p>
            <h3 className="report-stat-value">{salesData.length}</h3>
          </div>
        </motion.div>
        <motion.div className="report-stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="report-stat-icon" style={{ background: '#8b5cf620', color: '#8b5cf6' }}><Package size={22} /></div>
          <div>
            <p className="report-stat-label">Low Stock Items</p>
            <h3 className="report-stat-value" style={{ color: lowStockCount > 0 ? '#ef4444' : 'inherit' }}>{lowStockCount}</h3>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <div className="reports-tab-header">
            <div className="reports-tabs">
              <button
                className={`report-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <Package size={16} /> Inventory Stock Report
              </button>
              <button
                className={`report-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveTab('sales')}
              >
                <ShoppingCart size={16} /> Sales Report
              </button>
            </div>
            <div>
              {activeTab === 'inventory' ? (
                <Button onClick={handleExportInventory} isLoading={exportingInv}>
                  <Download size={16} /> Export CSV
                </Button>
              ) : (
                <Button onClick={handleExportSales} isLoading={exportingSales} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  <Download size={16} /> Export CSV
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : activeTab === 'inventory' ? (
            inventoryData.length > 0 ? (
              <Table columns={inventoryCols} data={inventoryData} />
            ) : (
              <div className="reports-empty">
                <Package size={48} strokeWidth={1} />
                <p>No inventory data available.</p>
              </div>
            )
          ) : (
            salesData.length > 0 ? (
              <Table columns={salesCols} data={salesData} />
            ) : (
              <div className="reports-empty">
                <ShoppingCart size={48} strokeWidth={1} />
                <p>No sales data available.</p>
              </div>
            )
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Reports;
