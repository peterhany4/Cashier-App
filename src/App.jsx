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

function RailButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-emerald-600 text-white shadow shadow-emerald-950/40'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {label}
      </span>
    </button>
  );
}

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
            <div className="h-screen app-bg text-white flex overflow-hidden relative" dir="rtl">

            {/* Side Rail — icon-only (w-16), floats OVER content; expands on hover (w-60) so it never reflows the page */}
            <aside className="group absolute inset-y-0 right-0 z-40 w-16 hover:w-60 bg-slate-900/85 backdrop-blur-xl border-l border-slate-800 flex flex-col items-center py-5 transition-all duration-300 shadow-2xl shadow-slate-950/40">
              {/* Brand */}
              <div className="flex items-center gap-3 px-3 mb-6 whitespace-nowrap">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 inline-flex items-center justify-center shadow-lg shadow-emerald-950/30">
                  <icons.cart size={22} strokeWidth={2} />
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <h1 className="text-lg font-black text-emerald-400 tracking-tight leading-tight">نظام الكاشير</h1>
                  <p className="text-[11px] text-slate-400 font-semibold">{currentUser.username}</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 w-full flex flex-col items-center gap-1.5 px-3 mb-2">
                <RailButton active={currentView === 'cashier'} onClick={() => setCurrentView('cashier')} icon={<icons.menu size={20} />} label="شاشة الكاشير" />
                <RailButton active={currentView === 'receipts'} onClick={() => setCurrentView('receipts')} icon={<icons.receipt size={20} />} label="سجل الفواتير" />
                {currentUser.role === 'admin' && (
                  <>
                    <RailButton active={currentView === 'admin'} onClick={() => setCurrentView('admin')} icon={<icons.dashboard size={20} />} label="لوحة التحكم" />
                    <RailButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon={<icons.settings size={20} />} label="الإعدادات" />
                  </>
                )}
              </nav>

              {/* Role chip + logout */}
              <div className="w-full flex flex-col items-center gap-3 px-3 pt-4 border-t border-slate-800 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  currentUser.role === 'admin' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}>
                  <icons.shield size={14} className="shrink-0" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {currentUser.role === 'admin' ? 'مدير النظام' : 'موظف مبيعات'}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm cursor-pointer shadow shadow-rose-950/40 flex items-center justify-center gap-2"
                >
                  <icons.logout size={16} className="shrink-0" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">تسجيل الخروج</span>
                </button>
              </div>
            </aside>

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