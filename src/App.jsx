import { useState, useEffect } from 'react';
import LoginPage from './features/login/LoginPage';
import CashierPage from './features/cashier/CashierPage';
import CashierReceiptsPage from './features/cashier/CashierReceiptsPage';
import AdminDashboardPage from './features/admin/AdminDashboardPage';
import { CartProvider } from './context/CartContext';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // holds user object when logged in
  const [currentView, setCurrentView] = useState('cashier'); // 'cashier', 'admin', or 'receipts'
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);

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
    <CartProvider>
      {!currentUser ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden" dir="rtl">
          {/* Unified Premium Header */}
          <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <h1 className="text-2xl font-black text-emerald-400">نظام الكاشير</h1>
              
              <div className="flex items-center gap-2 bg-slate-700/50 p-1 rounded-xl border border-slate-700">
                <span className="text-slate-300 text-xs px-2.5 py-1 font-semibold">
                  المستخدم: {currentUser.username}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  currentUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {currentUser.role === 'admin' ? 'مدير النظام' : 'موظف مبيعات'}
                </span>
              </div>

              {/* Navigation toggle */}
              <div className="flex gap-2 sm:mr-4 border-r border-slate-700 pr-4">
                <button
                  onClick={() => setCurrentView('cashier')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                    currentView === 'cashier'
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
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
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-950/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                      }`}
                    >
                      لوحة التحكم
                    </button>
                    <button
                      onClick={() => setCurrentView('receipts')}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                        currentView === 'receipts'
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-950/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
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
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-950/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                    }`}
                  >
                    سجل فواتيري 🧾
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm cursor-pointer shadow shadow-rose-950/40"
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
              />
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
  );
}