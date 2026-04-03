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

function MobileNav({ alertCount, onLogout }: { alertCount: number, onLogout: () => void }) {
  const [showMore, setShowMore] = useState(false);
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <>
      <nav className="mobile-nav">
        <div className="mobile-nav-content">
          <NavLink to="/kanban" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <Zap size={22} />
            <span>Produção</span>
          </NavLink>
          <NavLink to="/" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={22} />
            <span>Início</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <ClipboardList size={22} />
            <span>Entradas</span>
          </NavLink>
          <NavLink to="/order-control" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <CheckSquare size={22} />
            <span>Expedição</span>
          </NavLink>
          <button 
            className="mobile-nav-link" 
            onClick={() => setShowMore(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative', display: 'flex' }}>
              <Bell size={22} />
              {alertCount > 0 && <span className="alert-badge-count">{alertCount}</span>}
            </div>
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="modal-overlay" onClick={() => setShowMore(false)}>
          <div className="modal" style={{ marginBottom: 80, maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Menu</h2>
              <button className="btn btn-ghost" onClick={() => setShowMore(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
              <div style={{ padding: '8px 12px', marginBottom: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Operador:</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{user?.name || 'Administrador'}</div>
              </div>

              <NavLink to="/alerts" className="nav-link" onClick={() => setShowMore(false)}>
                <Bell size={20} />
                <span>Alertas ({alertCount})</span>
              </NavLink>
              <NavLink to="/stock-items" className="nav-link" onClick={() => setShowMore(false)}>
                <Archive size={20} />
                <span>Estoque</span>
              </NavLink>
              <NavLink to="/products" className="nav-link" onClick={() => setShowMore(false)}>
                <Package size={20} />
                <span>Catálogo</span>
              </NavLink>
              <NavLink to="/clients" className="nav-link" onClick={() => setShowMore(false)}>
                <Users size={20} />
                <span>Clientes</span>
              </NavLink>
              
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
                <button className="nav-link" onClick={() => { onLogout(); setShowMore(false); }} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-danger)' }}>
                  <LogOut size={20} />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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

        <MobileNav alertCount={alertCount} onLogout={handleLogout} />

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


