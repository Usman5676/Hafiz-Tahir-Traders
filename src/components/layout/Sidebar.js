import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Package, ShoppingCart, ClipboardList, 
  Truck, Users, AlertTriangle, FileText, LogOut, Shield, DollarSign
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();

  const allNavItems = [
    { name: t('sidebar.dashboard'), path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: t('sidebar.products'), path: '/products', icon: <Package size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: t('sidebar.salesBilling'), path: '/sales', icon: <ShoppingCart size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: t('sidebar.purchases'), path: '/purchases', icon: <ClipboardList size={20} />, roles: ['admin', 'manager'] },
    { name: t('sidebar.suppliers'), path: '/suppliers', icon: <Truck size={20} />, roles: ['admin', 'manager'] },
    { name: t('sidebar.customers'), path: '/customers', icon: <Users size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: 'Khata / Ledger', path: '/ledger', icon: <FileText size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: 'Collect Payment', path: '/collect-payment', icon: <DollarSign size={20} />, roles: ['admin', 'manager', 'cashier'] },
    { name: t('sidebar.lowStock'), path: '/low-stock', icon: <AlertTriangle size={20} />, roles: ['admin', 'manager'] },
    { name: t('sidebar.reports'), path: '/reports', icon: <FileText size={20} />, roles: ['admin', 'manager'] },
    { name: t('sidebar.systemUsers'), path: '/system-users', icon: <Shield size={20} />, roles: ['admin'] },
  ];

  // Filter based on user role
  const navItems = allNavItems.filter(item => 
    item.roles.includes(user?.role?.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="brand-logo">
          {t('navbar.brand')}
        </h2>
        <p className="brand-subtitle">{t('sidebar.inventoryManagement')}</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className="nav-item-content"
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="active-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <span className="sidebar-user-label">{t('sidebar.loggedInAs')}</span>
          <span className="sidebar-user-name">
            {user?.name || 'User'} ({user?.role || 'role'})
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="sidebar-logout-btn"
        >
          <LogOut size={18} />
          {t('sidebar.logout')}
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
