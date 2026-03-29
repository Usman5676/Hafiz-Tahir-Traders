import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { useTranslation } from '../context/LanguageContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Dashboard.css';
import './SystemUsers.css';

const roleBadge = (role) => {
  const colors = {
    admin: { bg: '#dbeafe', color: '#1d4ed8' },
    cashier: { bg: '#dcfce7', color: '#16a34a' },
    manager: { bg: '#fef3c7', color: '#d97706' },
  };
  const c = colors[role] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span
      className="role-badge"
      style={{ background: c.bg, color: c.color }}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

const SystemUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'cashier' });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.warning('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users', formData);
      toast.success('User added successfully');
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete user "${name}"?`)) {
      try {
        await api.delete(`/users/${id}`);
        toast.success('User deleted');
        fetchUsers();
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('systemUsersTitle')}</h1>
          <p className="page-subtitle">{t('manageRBAC')}</p>
        </div>
        <Button onClick={openModal} className="glass">
          <Plus size={20} /> {t('addNewUser')}
        </Button>
      </header>

      {loading ? (
        <Card><Loader /></Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="users-table-container glass">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t('userDetails')}</th>
                  <th>{t('role')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center text-secondary py-4">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="user-row"
                    >
                      <td>
                        <div className="user-details">
                          <span className="user-detail-name">{user.name}</span>
                          <span className="user-detail-email">{user.email}</span>
                        </div>
                      </td>
                      <td>{roleBadge(user.role)}</td>
                      <td>
                        <div className="user-actions">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="action-icon-btn delete"
                            onClick={() => handleDelete(user.id, user.name)}
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Add User Modal */}
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
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={20} /> {t('addNewUser')}
                  </h3>
                  <button onClick={closeModal} className="icon-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <Input
                    label={t('fullName')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label={t('emailAddress')}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label={t('password')}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <div className="input-wrapper">
                    <label className="input-label">{t('role')}</label>
                    <select
                      className="input-field"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button type="button" variant="secondary" onClick={closeModal}>{t('cancel')}</Button>
                    <Button type="submit" isLoading={submitting}>{t('addUser')}</Button>
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

export default SystemUsers;
