import React, { useContext, useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, AlertTriangle, Send } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import './Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { toggleLang, t } = useTranslation();
  const [showNotif, setShowNotif] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [sendingAlert, setSendingAlert] = useState(false);
  const notifRef = useRef(null);

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await api.get('/products');
        const products = Array.isArray(res.data) ? res.data : [];
        const low = products.filter(
          (p) => (p.quantity !== undefined ? p.quantity : p.stock) < 10
        );
        setLowStockItems(low);
      } catch (e) {}
    };
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <h2>Hafiz Tahir <span className="accent">Traders</span></h2>
      </div>

      <div className="navbar-actions">
        {/* Language Toggle */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={toggleLang}
          className="lang-toggle-btn"
        >
          {lang === 'en' ? 'English | اردو' : 'اردو | English'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="navbar-icon-btn"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </motion.button>

        <div className="notif-wrapper" ref={notifRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="navbar-icon-btn notification-btn"
            aria-label="Notifications"
            onClick={() => setShowNotif(!showNotif)}
          >
            <Bell size={20} />
            {lowStockItems.length > 0 && (
              <span className="notification-badge">{lowStockItems.length}</span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotif && (
              <motion.div
                className="notif-popup"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="notif-header">
                  <div className="notif-title">
                    <AlertTriangle size={18} />
                    <span>{t('navbar.notifications')}</span>
                  </div>
                  {lowStockItems.length > 0 && (
                    <span className="notif-new-badge">{lowStockItems.length} {t('navbar.newLabel')}</span>
                  )}
                </div>

                <div className="notif-list">
                  {lowStockItems.length === 0 ? (
                    <div className="notif-empty">{t('navbar.noAlerts')}</div>
                  ) : (
                    lowStockItems.map((item, i) => {
                      const qty = item.quantity !== undefined ? item.quantity : item.stock;
                      return (
                        <div key={item.id || i} className="notif-item">
                          <span className="notif-item-name">{item.name || 'Unnamed'}</span>
                          <span className="notif-item-msg">
                            {t('navbar.stockRunningLow')} <strong>{qty} {t('navbar.left')}</strong>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <button className="notif-sms-btn" onClick={handleSendAlert} disabled={sendingAlert} style={{ opacity: sendingAlert ? 0.7 : 1 }}>
                  <Send size={16} />
                  {sendingAlert ? (t('navbar.sending') || 'Sending...') : t('navbar.sendSmsAlert')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="navbar-avatar">
          {initials}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
