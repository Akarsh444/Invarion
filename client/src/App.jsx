import Landing from './components/Landing';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import ProductGrid from './components/ProductGrid';
import AdminPanel from './components/AdminPanel';
import OrdersList from './components/OrdersList';

function AppContent() {
  const { user, logout } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const bump = () => setRefresh((n) => n + 1);

  if (!user && !showAuth) return <Landing onEnter={() => setShowAuth(true)} />;
  if (!user) return <AuthForm onBack={() => setShowAuth(false)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Invarion</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.email} <span className="text-gray-400">({user.role})</span>
          </span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {user.role === 'ADMIN' && <AdminPanel onProductCreated={bump} />}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Products</h2>
          <ProductGrid refreshSignal={refresh} onOrderPlaced={bump} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">My Orders</h2>
          <OrdersList refreshSignal={refresh} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}