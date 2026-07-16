import React, { useState } from 'react';
import LoginPage from './features/login/LoginPage';
import CashierPage from './features/cashier/CashierPage';
import { CartProvider } from './context/CartContext';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // holds user object when logged in

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <CartProvider>
      {!currentUser ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <CashierPage user={currentUser} onLogout={handleLogout} />
      )}
    </CartProvider>
  );
}