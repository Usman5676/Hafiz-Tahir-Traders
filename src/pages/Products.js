import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, X, Search, 
  Download, TrendingUp, Package, AlertTriangle, 
  DollarSign 
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { useTranslation } from '../context/LanguageContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import './Products.css';

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSize, setFilterSize] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    size: '', 
    buy_price: '', 
    sell_price: '', 
    stock: '',
    min_stock: 10
  });
  const [submitting, setSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

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

  // Stats Calculations
  const stats = useMemo(() => {
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.sell_price * p.stock), 0);
    const totalPotentialProfit = products.reduce((sum, p) => sum + ((p.sell_price - p.buy_price) * p.stock), 0);
    const lowStockCount = products.filter(p => p.stock <= (p.min_stock || 10)).length;
    
    return {
      totalValue: totalInventoryValue,
      totalProfit: totalPotentialProfit,
      lowStock: lowStockCount,
      totalProducts: products.length
    };
  }, [products]);

  // Filtering & Sorting Logic
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.size?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterSize !== 'All') {
      result = result.filter(p => p.size === filterSize);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA, valB;
        
        if (sortConfig.key === 'profit') {
          valA = a.sell_price - a.buy_price;
          valB = b.sell_price - b.buy_price;
        } else if (sortConfig.key === 'total_profit') {
          valA = (a.sell_price - a.buy_price) * a.stock;
          valB = (b.sell_price - b.buy_price) * b.stock;
        } else if (sortConfig.key === 'status') {
          valA = a.stock <= (a.min_stock || 10) ? 0 : 1;
          valB = b.stock <= (b.min_stock || 10) ? 0 : 1;
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, filterSize, sortConfig]);

  const sizes = ['All', ...new Set(products.map(p => p.size).filter(Boolean))];

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id || product._id);
      setFormData({ 
        name: product.name || '', 
        size: product.size || '',
        buy_price: product.buy_price || '', 
        sell_price: product.sell_price || product.price || '', 
        stock: product.stock !== undefined ? product.stock : product.quantity || '',
        min_stock: product.min_stock !== undefined ? product.min_stock : 10
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', size: '', buy_price: '', sell_price: '', stock: '', min_stock: 10 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.buy_price || !formData.sell_price || formData.stock === '' || formData.min_stock === '') {
      toast.warning('Please fill all required fields');
      return;
    }

    if (Number(formData.buy_price) > Number(formData.sell_price)) {
      toast.warning('Buy Price cannot be greater than Sell Price');
      return;
    }

    if (Number(formData.stock) < 0) {
      toast.warning('Stock cannot be negative');
      return;
    }

    if (Number(formData.min_stock) < 0) {
      toast.warning('Low stock limit cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, formData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData);
        toast.success('Product added successfully');
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
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing headers");
        return;
      }

      // Simple CSV parser that handles quotes
      const parseCSVLine = (line) => {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result.map(v => v.replace(/^"|"$/g, ''));
      };

      const headers = parseCSVLine(lines[0]);
      const data = lines.slice(1).map(line => parseCSVLine(line));

      const validatedData = [];
      const errors = [];

      data.forEach((rowValues, index) => {
        const row = {};
        headers.forEach((h, i) => row[h] = rowValues[i]);

        const product = {
          name: row['Product Name'] || row['name'] || row['Name'],
          size: row['Size'] || row['size'] || '',
          buy_price: parseFloat(row['Buy Price'] || row['buy_price'] || 0),
          sell_price: parseFloat(row['Sell Price'] || row['sell_price'] || 0),
          stock: parseInt(row['Stock Quantity'] || row['stock'] || 0),
          min_stock: parseInt(row['Low Stock Alert Limit'] || row['min_stock'] || 10)
        };

        // Validation
        if (!product.name) errors.push(`Row ${index + 1}: Name is required`);
        if (isNaN(product.buy_price)) errors.push(`Row ${index + 1}: Invalid Buy Price`);
        if (isNaN(product.sell_price)) errors.push(`Row ${index + 1}: Invalid Sell Price`);
        if (product.buy_price > product.sell_price) errors.push(`Row ${index + 1}: Buy Price > Sell Price`);

        validatedData.push(product);
      });

      setImportData(validatedData);
      setImportErrors(errors);
      setIsImportModalOpen(true);
      e.target.value = ''; // Reset file input
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (importErrors.length > 0) {
      toast.error("Please fix errors before importing");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/products/bulk', importData);
      toast.success('Bulk products imported successfully');
      setIsImportModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error('Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Size', 'Buy Price', 'Sell Price', 'Stock', 'Profit Per Unit', 'Total Profit'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.size,
      p.buy_price,
      p.sell_price,
      p.stock,
      p.sell_price - p.buy_price,
      (p.sell_price - p.buy_price) * p.stock
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { 
      header: 'Product Name', 
      accessor: 'name',
      sortable: true,
      cell: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{row.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {row.id || row._id}</span>
        </div>
      )
    },
    { header: 'Size', accessor: 'size', sortable: true },
    { 
      header: 'Buy Price', 
      accessor: 'buy_price', 
      sortable: true,
      cell: (row) => `Rs. ${Number(row.buy_price).toLocaleString()}` 
    },
    { 
      header: 'Sell Price', 
      accessor: 'sell_price', 
      sortable: true,
      cell: (row) => `Rs. ${Number(row.sell_price).toLocaleString()}` 
    },
    { 
      header: 'Stock', 
      accessor: 'stock', 
      sortable: true,
      cell: (row) => {
        const isLow = row.stock <= (row.min_stock || 10);
        return (
          <span style={{ 
            color: isLow ? 'var(--danger)' : 'var(--success)', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {row.stock}
            {isLow && <AlertTriangle size={14} />}
          </span>
        );
      }
    },
    {
      header: 'Profit/Loss',
      accessor: 'total_profit',
      sortable: true,
      cell: (row) => {
        const profit = row.sell_price - row.buy_price;
        const totalProfit = profit * row.stock;
        return (
          <div className={`profit-badge ${profit >= 0 ? 'positive' : 'negative'}`}>
            {profit >= 0 ? '+' : ''}Rs. {totalProfit.toLocaleString()}
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (row) => {
        const isLow = row.stock <= (row.min_stock || 10);
        return (
          <span className={`status-badge ${isLow ? 'low' : 'ok'}`}>
            {isLow ? 'Low Stock' : 'In Stock'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
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

  // Chart Data
  const chartData = useMemo(() => {
    return products
      .filter(p => p.sell_price - p.buy_price > 0)
      .map(p => ({
        name: p.name,
        profit: (p.sell_price - p.buy_price) * p.stock,
        unitProfit: p.sell_price - p.buy_price
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [products]);

  const currentProfit = (Number(formData.sell_price) || 0) - (Number(formData.buy_price) || 0);
  const currentTotalProfit = currentProfit * (Number(formData.stock) || 0);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('Inventory Management')}</h1>
          <p className="page-subtitle">Track, manage and analyze your products</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            id="csv-import" 
            style={{ display: 'none' }} 
            onChange={handleFileSelect}
          />
          <Button onClick={() => document.getElementById('csv-import').click()} variant="secondary" className="glass">
            <Plus size={20} /> Import CSV
          </Button>
          <Button onClick={exportToCSV} variant="secondary" className="glass">
            <Download size={20} /> Export CSV
          </Button>
          <Button onClick={() => openModal()} className="glass">
            <Plus size={20} /> Add Product
          </Button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="products-dashboard">
        <div className="stat-card">
          <span className="stat-label">Total Products</span>
          <span className="stat-value">{stats.totalProducts}</span>
          <Package size={24} style={{ opacity: 0.2, position: 'absolute', right: '20px', bottom: '20px' }} />
        </div>
        <div className="stat-card value">
          <span className="stat-label">Inventory Value</span>
          <span className="stat-value">Rs. {stats.totalValue.toLocaleString()}</span>
          <DollarSign size={24} style={{ opacity: 0.2, position: 'absolute', right: '20px', bottom: '20px' }} />
        </div>
        <div className="stat-card profit">
          <span className="stat-label">Potential Profit</span>
          <span className="stat-value">Rs. {stats.totalProfit.toLocaleString()}</span>
          <TrendingUp size={24} style={{ opacity: 0.2, position: 'absolute', right: '20px', bottom: '20px' }} />
        </div>
        <div className="stat-card low-stock">
          <span className="stat-label">Low Stock Alert</span>
          <span className="stat-value">{stats.lowStock}</span>
          <AlertTriangle size={24} style={{ opacity: 0.2, position: 'absolute', right: '20px', bottom: '20px' }} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar">
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or size..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <select 
            className="search-input" 
            style={{ width: 'auto', paddingLeft: '12px' }}
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
          >
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Card><Loader /></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Table 
              columns={columns} 
              data={filteredProducts} 
              onSort={requestSort}
              sortConfig={sortConfig}
            />
          </Card>
        </motion.div>
      )}

      {/* Analytics Section */}
      {!loading && chartData.length > 0 && (
        <div className="analytics-section">
          <h2 className="analytics-title">Top Profit Performers</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--card-bg)', border: 'none', borderRadius: '8px', boxShadow: 'var(--shadow)' }}
                  formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Total Profit']}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 1000 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{ maxWidth: '500px', width: '100%' }}
            >
              <Card style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 600 }}>
                    {editingId ? <Edit2 size={24} style={{ color: 'var(--accent-primary)' }}/> : <Plus size={24} style={{ color: 'var(--accent-primary)' }}/>}
                    {editingId ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button onClick={closeModal} className="icon-btn" style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-secondary)' }}>
                    <X size={20}/>
                  </button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Input 
                    label="Product Name" 
                    placeholder="e.g. Cotton Shirt"
                    required
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  
                  <Input 
                    label="Size" 
                    placeholder="e.g. 1L, 500ml, XL, Box"
                    required
                    value={formData.size} 
                    onChange={e => setFormData({...formData, size: e.target.value})} 
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <Input 
                      type="number"
                      label="Buy Price (Rs.)" 
                      placeholder="0"
                      required
                      value={formData.buy_price} 
                      onChange={e => setFormData({...formData, buy_price: e.target.value})} 
                    />
                    <Input 
                      type="number"
                      label="Sell Price (Rs.)" 
                      placeholder="0"
                      required
                      value={formData.sell_price} 
                      onChange={e => setFormData({...formData, sell_price: e.target.value})} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <Input 
                      type="number"
                      label="Stock Quantity" 
                      placeholder="0"
                      required
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                    />
                    <Input 
                      type="number"
                      label="Low Stock Limit" 
                      placeholder="e.g. 10"
                      required
                      value={formData.min_stock} 
                      onChange={e => setFormData({...formData, min_stock: e.target.value})} 
                    />
                  </div>

                  {/* Real-time Profit Preview */}
                  <div className="profit-calculator">
                    <div className="calc-row">
                      <span className="calc-label">Profit per Unit:</span>
                      <span className={`calc-value ${currentProfit >= 0 ? 'profit' : 'loss'}`}>
                        Rs. {currentProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="calc-row">
                      <span className="calc-label">Total Potential Profit:</span>
                      <span className={`calc-value ${currentTotalProfit >= 0 ? 'profit' : 'loss'}`}>
                        Rs. {currentTotalProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    <Button type="button" variant="secondary" onClick={closeModal}>{t('cancel')}</Button>
                    <Button type="submit" isLoading={submitting}>
                      {editingId ? 'Update Product' : 'Save Product'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Import Preview Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 1100 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{ maxWidth: '800px', width: '95%' }}
            >
              <Card style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Plus size={24} style={{ color: 'var(--accent-primary)' }}/>
                    CSV Import Preview ({importData.length} Products)
                  </h3>
                  <button onClick={() => setIsImportModalOpen(false)} className="icon-btn" style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-secondary)' }}>
                    <X size={20}/>
                  </button>
                </div>

                {importErrors.length > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                    <strong>Errors found:</strong>
                    <ul style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                      {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Buy</th>
                        <th>Sell</th>
                        <th>Stock</th>
                        <th>Profit/Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, i) => (
                        <tr key={i}>
                          <td>{row.name}</td>
                          <td>{row.size}</td>
                          <td>{row.buy_price}</td>
                          <td>{row.sell_price}</td>
                          <td>{row.stock}</td>
                          <td style={{ color: row.sell_price - row.buy_price >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {(row.sell_price - row.buy_price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                  <Button type="button" variant="secondary" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleBulkImport} 
                    isLoading={submitting}
                    disabled={importErrors.length > 0}
                  >
                    Confirm Import
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
