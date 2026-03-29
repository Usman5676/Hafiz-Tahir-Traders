import React, { createContext, useState, useContext } from 'react';

const translations = {
  en: {
    // Navbar
    viewInUrdu: 'اردو میں دیکھیں',
    notifications: 'Notifications',
    newLabel: 'New',
    stockRunningLow: 'Stock is running low:',
    left: 'left!',
    sendSmsAlert: 'Send Twilio SMS Alert',
    noAlerts: 'No alerts right now 🎉',

    // Sidebar
    inventoryManagement: 'Inventory Management',
    dashboard: 'Dashboard',
    products: 'Products',
    salesBilling: 'Sales & Billing',
    purchases: 'Purchases (Stock In)',
    suppliers: 'Suppliers',
    customers: 'Customers',
    lowStock: 'Low Stock',
    reports: 'Reports',
    systemUsers: 'System Users',
    loggedInAs: 'Logged in as:',
    logout: 'Logout',

    // Dashboard
    storeOverview: 'Store Overview',
    totalProducts: 'Total Products',
    monthlySales: 'Monthly Sales (Rs.)',
    lowStockAlerts: 'Low Stock Alerts',
    recentOrders: 'Recent Orders',
    salesTrend: 'Sales Trend (This Month)',
    itemsNeedingRestock: 'Items Needing Restock',
    items: 'items',
    allWellStocked: 'All items are well-stocked 🎉',
    week: 'Week',
    sales: 'sales',

    // Products
    manageProducts: 'Manage your inventory products.',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    addNewProduct: 'Add New Product',
    productName: 'Product Name',
    price: 'Price (Rs.)',
    stockQuantity: 'Stock Quantity',
    save: 'Save',
    update: 'Update',
    cancel: 'Cancel',
    actions: 'Actions',
    name: 'Name',
    stock: 'Stock',
    id: 'ID',

    // Suppliers
    manageSuppliers: 'Manage your vendor relationships.',
    addSupplier: 'Add Supplier',
    editSupplier: 'Edit Supplier',
    addNewSupplier: 'Add New Supplier',
    supplierName: 'Supplier Name',
    contactNumber: 'Contact Number',
    contact: 'Contact',
    email: 'Email',

    // Customers
    manageCustomers: 'Manage your customer database.',
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    addNewCustomer: 'Add New Customer',
    customerName: 'Customer Name',
    phone: 'Phone',
    phoneNumber: 'Phone Number',
    address: 'Address',
    physicalAddress: 'Physical Address',

    // Sales
    salesTitle: 'Sales',
    manageSales: 'Track outbound sales and generate invoices.',
    recordSale: 'Record Sale',
    recordNewSale: 'Record New Sale',
    selectProduct: 'Select Product',
    chooseProduct: '-- Choose Product --',
    quantity: 'Quantity',
    totalAmount: 'Total Amount (Rs.)',
    submitSale: 'Submit Sale',
    saleId: 'Sale ID',
    product: 'Product',
    qty: 'Qty',
    totalRs: 'Total (Rs.)',
    date: 'Date',

    // Purchases
    purchasesTitle: 'Purchases (Stock In)',
    managePurchases: 'Track inbound purchases and restock items.',
    recordPurchase: 'Record Purchase',
    recordStockPurchase: 'Record Stock Purchase',
    chooseRestock: '-- Choose Product to Restock --',
    quantityToAdd: 'Quantity to Add',
    totalCost: 'Total Cost (Rs.)',
    submitPurchase: 'Submit Purchase',
    purchaseId: 'Purchase ID',
    qtyAdded: 'Qty Added',
    costRs: 'Cost (Rs.)',

    // Low Stock
    lowStockTitle: 'Low Stock Alerts',
    lowStockSubtitle: 'Products that need restocking immediately.',
    currentStock: 'Current Stock',
    status: 'Status',
    critical: 'Critical',
    low: 'Low',
    allProductsWellStocked: 'All products are well-stocked! 🎉',

    // System Users
    systemUsersTitle: 'System Users',
    manageRBAC: 'Manage role-based access control (RBAC)',
    addNewUser: 'Add New User',
    userDetails: 'User Details',
    role: 'Role',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    password: 'Password',
    addUser: 'Add User',
    noUsersFound: 'No users found',

    // Reports
    reportsTitle: 'Reports & Analytics',
    reportsSubtitle: 'View low stock alerts and business reports.',
    exportCsv: 'Export CSV',
    generatedReports: 'Generated System Reports',
    noReports: 'No recent reports available.',
    allStocked: 'All products are sufficiently stocked!',
    reportId: 'Report ID',
    type: 'Type',

    // Login
    signIn: 'Sign In',
    signInSubtitle: 'Sign in to manage your grocery store',
  },
  ur: {
    // Navbar
    viewInUrdu: 'View in English',
    notifications: 'اطلاعات',
    newLabel: 'نئی',
    stockRunningLow: 'اسٹاک کم ہو رہا ہے:',
    left: 'باقی!',
    sendSmsAlert: 'ایس ایم ایس الرٹ بھیجیں',
    noAlerts: 'ابھی کوئی الرٹ نہیں 🎉',

    // Sidebar
    inventoryManagement: 'انوینٹری مینجمنٹ',
    dashboard: 'ڈیش بورڈ',
    products: 'مصنوعات',
    salesBilling: 'فروخت اور بلنگ',
    purchases: 'خریداری (اسٹاک ان)',
    suppliers: 'سپلائرز',
    customers: 'گاہک',
    lowStock: 'کم اسٹاک',
    reports: 'رپورٹس',
    systemUsers: 'سسٹم صارفین',
    loggedInAs: 'لاگ ان بطور:',
    logout: 'لاگ آؤٹ',

    // Dashboard
    storeOverview: 'اسٹور کا جائزہ',
    totalProducts: 'کل مصنوعات',
    monthlySales: 'ماہانہ فروخت (روپے)',
    lowStockAlerts: 'کم اسٹاک الرٹس',
    recentOrders: 'حالیہ آرڈرز',
    salesTrend: 'فروخت کا رجحان (اس مہینے)',
    itemsNeedingRestock: 'ری اسٹاک کی ضرورت',
    items: 'اشیاء',
    allWellStocked: 'تمام اشیاء کا اسٹاک اچھا ہے 🎉',
    week: 'ہفتہ',
    sales: 'فروخت',

    // Products
    manageProducts: 'اپنی انوینٹری مصنوعات کا انتظام کریں۔',
    addProduct: 'مصنوعات شامل کریں',
    editProduct: 'مصنوعات میں ترمیم',
    addNewProduct: 'نئی مصنوعات شامل کریں',
    productName: 'مصنوعات کا نام',
    price: 'قیمت (روپے)',
    stockQuantity: 'اسٹاک مقدار',
    save: 'محفوظ کریں',
    update: 'اپ ڈیٹ',
    cancel: 'منسوخ',
    actions: 'ایکشنز',
    name: 'نام',
    stock: 'اسٹاک',
    id: 'آئی ڈی',

    // Suppliers
    manageSuppliers: 'اپنے سپلائرز کا انتظام کریں۔',
    addSupplier: 'سپلائر شامل کریں',
    editSupplier: 'سپلائر میں ترمیم',
    addNewSupplier: 'نیا سپلائر شامل کریں',
    supplierName: 'سپلائر کا نام',
    contactNumber: 'رابطہ نمبر',
    contact: 'رابطہ',
    email: 'ای میل',

    // Customers
    manageCustomers: 'اپنے گاہکوں کا انتظام کریں۔',
    addCustomer: 'گاہک شامل کریں',
    editCustomer: 'گاہک میں ترمیم',
    addNewCustomer: 'نیا گاہک شامل کریں',
    customerName: 'گاہک کا نام',
    phone: 'فون',
    phoneNumber: 'فون نمبر',
    address: 'پتہ',
    physicalAddress: 'مکمل پتہ',

    // Sales
    salesTitle: 'فروخت',
    manageSales: 'فروخت کے ریکارڈز دیکھیں اور انوائس بنائیں۔',
    recordSale: 'فروخت ریکارڈ کریں',
    recordNewSale: 'نئی فروخت ریکارڈ کریں',
    selectProduct: 'مصنوعات منتخب کریں',
    chooseProduct: '-- مصنوعات منتخب کریں --',
    quantity: 'مقدار',
    totalAmount: 'کل رقم (روپے)',
    submitSale: 'فروخت جمع کریں',
    saleId: 'فروخت آئی ڈی',
    product: 'مصنوعات',
    qty: 'مقدار',
    totalRs: 'کل (روپے)',
    date: 'تاریخ',

    // Purchases
    purchasesTitle: 'خریداری (اسٹاک ان)',
    managePurchases: 'خریداری ٹریک کریں اور اشیاء ری اسٹاک کریں۔',
    recordPurchase: 'خریداری ریکارڈ کریں',
    recordStockPurchase: 'اسٹاک خریداری ریکارڈ کریں',
    chooseRestock: '-- ری اسٹاک کے لیے مصنوعات منتخب کریں --',
    quantityToAdd: 'شامل کرنے کی مقدار',
    totalCost: 'کل لاگت (روپے)',
    submitPurchase: 'خریداری جمع کریں',
    purchaseId: 'خریداری آئی ڈی',
    qtyAdded: 'شامل مقدار',
    costRs: 'لاگت (روپے)',

    // Low Stock
    lowStockTitle: 'کم اسٹاک الرٹس',
    lowStockSubtitle: 'ایسی مصنوعات جنہیں فوری طور پر ری اسٹاک کی ضرورت ہے۔',
    currentStock: 'موجودہ اسٹاک',
    status: 'حالت',
    critical: 'تشویشناک',
    low: 'کم',
    allProductsWellStocked: 'تمام مصنوعات کا اسٹاک اچھا ہے! 🎉',

    // System Users
    systemUsersTitle: 'سسٹم صارفین',
    manageRBAC: 'رول پر مبنی رسائی کنٹرول (RBAC) کا انتظام کریں',
    addNewUser: 'نیا صارف شامل کریں',
    userDetails: 'صارف کی تفصیلات',
    role: 'کردار',
    fullName: 'پورا نام',
    emailAddress: 'ای میل ایڈریس',
    password: 'پاس ورڈ',
    addUser: 'صارف شامل کریں',
    noUsersFound: 'کوئی صارف نہیں ملا',

    // Reports
    reportsTitle: 'رپورٹس اور تجزیات',
    reportsSubtitle: 'کم اسٹاک الرٹس اور کاروباری رپورٹس دیکھیں۔',
    exportCsv: 'CSV ایکسپورٹ',
    generatedReports: 'تیار کردہ سسٹم رپورٹس',
    noReports: 'کوئی حالیہ رپورٹ دستیاب نہیں۔',
    allStocked: 'تمام مصنوعات کا اسٹاک کافی ہے!',
    reportId: 'رپورٹ آئی ڈی',
    type: 'قسم',

    // Login
    signIn: 'سائن ان',
    signInSubtitle: 'اپنے گروسری اسٹور کا انتظام کرنے کے لیے سائن ان کریں',
  },
};

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const toggleLang = () => setLang((prev) => (prev === 'en' ? 'ur' : 'en'));
  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
