import { useState, useEffect } from 'react';
import LoginPage from './features/login/LoginPage';
import CashierPage from './features/cashier/CashierPage';
import CashierReceiptsPage from './features/cashier/CashierReceiptsPage';
import AdminDashboardPage from './features/admin/AdminDashboardPage';
import SettingsPage from './features/admin/SettingsPage';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/ui';
import ConfirmProvider from './components/ui/ConfirmProvider';
import icons from './components/icons';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // holds user object when logged in
  const [currentView, setCurrentView] = useState('cashier'); // 'cashier', 'admin', or 'receipts'
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dbVersion, setDbVersion] = useState(0); // bumped after a DB restore so views re-fetch

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser && window.api && window.api.db) {
        try {
          const [dbMenu, dbCategories] = await Promise.all([
            window.api.db.getMenu(),
            window.api.db.getCategories()
          ]);
          setMenu(dbMenu);
          setCategories(dbCategories);
        } catch (err) {
          console.error('Error fetching data from SQLite:', err);
        }
      }
    };
    fetchData();
  }, [currentUser, dbVersion]);

  useEffect(() => {
    if (window.api && window.api.db && window.api.db.onDatabaseRestored) {
      // When a restore overwrites the DB, re-fetch menu/categories + bump dbVersion
      // so the admin dashboard re-loads its own datasets.
      const unsubscribe = window.api.db.onDatabaseRestored(() => {
        setDbVersion(v => v + 1);
        if (currentUser && window.api.db) {
          Promise.all([
            window.api.db.getMenu(),
            window.api.db.getCategories()
          ]).then(([dbMenu, dbCategories]) => {
            setMenu(dbMenu);
            setCategories(dbCategories);
          }).catch((err) => console.error('Error reloading after restore:', err));
        }
      });
      return () => { if (window.api.db.onDatabaseRestored) unsubscribe(); };
    }
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentView('cashier');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('cashier');
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <CartProvider>
          {!currentUser ? (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          ) : (
            <div className="h-screen app-bg text-white flex flex-col overflow-hidden" dir="rtl">
          {/* Unified Premium Header */}
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/70 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg shadow-slate-900/5">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 inline-flex items-center justify-center shadow-md shadow-emerald-600/10">
                  <icons.cart size={20} strokeWidth={2} />
                </span>
                <h1 className="text-2xl font-black text-emerald-700 tracking-tight">نظام الكاشير</h1>
              </div>
              
              <div className="flex items-center gap-2 bg-surface-3/60 p-1 rounded-xl border border-slate-200">
                <span className="text-slate-600 text-xs px-2.5 py-1 font-semibold">
                  المستخدم: {currentUser.username}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  currentUser.role === 'admin' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                }`}>
                  {currentUser.role === 'admin' ? 'مدير النظام' : 'موظف مبيعات'}
                </span>
              </div>

              {/* Navigation toggle */}
              <div className="flex gap-2 sm:mr-4 border-r border-slate-200 pr-4">
                <button
                  onClick={() => setCurrentView('cashier')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                    currentView === 'cashier'
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-900/20'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-surface-3/70'
                  }`}
                >
                  شاشة الكاشير
                </button>
                
                {currentUser.role === 'admin' ? (
                  <>
                    <button
                      onClick={() => setCurrentView('admin')}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                        currentView === 'admin'
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-900/20'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-surface-3/70'
                      }`}
                    >
                      لوحة التحكم
                    </button>
                    <button
                      onClick={() => setCurrentView('receipts')}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                        currentView === 'receipts'
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-900/20'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-surface-3/70'
                      }`}
                    >
                      سجل فواتيري
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setCurrentView('receipts')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                      currentView === 'receipts'
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-900/20'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-surface-3/70'
                    }`}
                  >
                    سجل فواتيري <icons.receipt size={15} className="inline" />
                  </button>
                )}
              </div>

              {currentUser.role === 'admin' && (
                <div className="flex gap-2 sm:mr-4 border-r border-slate-200 pr-4">
                  <button
                    onClick={() => setCurrentView('settings')}
                    title="الإعدادات"
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                      currentView === 'settings'
                        ? 'bg-surface-3 text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-surface-3/70'
                    }`}
                  >
                    <icons.settings size={16} className="inline" /> الإعدادات
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm cursor-pointer shadow shadow-rose-900/20"
            >
              تسجيل الخروج
            </button>
          </header>

          {/* Page Content Display Area */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {currentUser.role === 'admin' && currentView === 'admin' ? (
              <AdminDashboardPage 
                user={currentUser} 
                menu={menu} 
                setMenu={setMenu}
                categories={categories}
                setCategories={setCategories}
                dbVersion={dbVersion}
              />
            ) : currentUser.role === 'admin' && currentView === 'settings' ? (
              <SettingsPage />
            ) : currentView === 'receipts' ? (
              <CashierReceiptsPage user={currentUser} />
            ) : (
              <CashierPage 
                user={currentUser} 
                menu={menu}
                categories={categories}
              />
            )}
          </div>
        </div>
      )}
      </CartProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}