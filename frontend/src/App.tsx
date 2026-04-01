import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './services/api';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Zap, 
  Package, 
  Bell, 
  Users,
  LogOut,
  Archive,
  CheckSquare
} from 'lucide-react';
import { useSocket } from './hooks/useSocket';

import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import KanbanPage from './pages/KanbanPage';
import ProductsPage from './pages/ProductsPage';
import AlertsPage from './pages/AlertsPage';
import ClientsPage from './pages/ClientsPage';
import LoginPage from './pages/LoginPage';
import StockItemsPage from './pages/StockItemsPage';
import OrderControlPage from './pages/OrderControlPage';

function Sidebar({ alertCount, onLogout }: { alertCount: number, onLogout: () => void }) {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">✨</div>
        <div className="logo-text">Toque Ideal</div>
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink to="/kanban" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Zap size={20} />
          <span>Produção</span>
        </NavLink>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ClipboardList size={20} />
          <span>Entradas</span>
        </NavLink>
        <NavLink to="/order-control" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <CheckSquare size={20} />
          <span>Expedição</span>
        </NavLink>
        <NavLink to="/stock-items" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Archive size={20} />
          <span>Estoque</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Catálogo</span>
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <div style={{ position: 'relative', display: 'flex' }}>
            <Bell size={20} />
            {alertCount > 0 && <span className="alert-badge-count">{alertCount}</span>}
          </div>
          <span>Alertas</span>
        </NavLink>
      </nav>
      {/* ... rest of sidebar code ... */}

      <div style={{ padding: '20px 0', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '0 20px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operador:</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{user?.name || 'Administrador'}</div>
        </div>
        <button className="nav-link" onClick={onLogout} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogOut size={20} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);
  const { subscribe } = useSocket();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const fetchAlertCount = () => {
    if (!localStorage.getItem('token')) return;
    api.get('/alerts/count').then(res => setAlertCount(res.data.count)).catch(() => {});
  };

  useEffect(() => {
    if (user) {
      fetchAlertCount();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribe('alert:new', fetchAlertCount);
      return () => { unsubscribe(); };
    }
  }, [subscribe, user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    return (
      <>
        <LoginPage onLogin={setUser} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar alertCount={alertCount} onLogout={handleLogout} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/order-control" element={<OrderControlPage />} />
            <Route path="/stock-items" element={<StockItemsPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/alerts" element={<AlertsPage onMarkRead={fetchAlertCount} />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-1)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
            }
          }}
        />
      </div>
    </BrowserRouter>
  );
}
