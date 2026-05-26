import { useState, useEffect, Suspense, lazy } from 'react';
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
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Settings,
  Menu
} from 'lucide-react';

import { useSocket } from './hooks/useSocket';
import { STEP_LABELS } from './types';
import CommandPalette from './components/CommandPalette';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const StockItemsPage = lazy(() => import('./pages/StockItemsPage'));
const OrderControlPage = lazy(() => import('./pages/OrderControlPage'));
const ProductionSectorPage = lazy(() => import('./pages/ProductionSectorPage'));
const PublicTrackingPage = lazy(() => import('./pages/PublicTrackingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProductionQueuePage = lazy(() => import('./pages/ProductionQueuePage'));




function Sidebar({ alertCount, onLogout, sectors, user, isOpen, onClose }: { alertCount: number, onLogout: () => void, sectors: any[], user: any, isOpen?: boolean, onClose?: () => void }) {
  const [showProduction, setShowProduction] = useState(true);

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 40 }}>
          <img src="/logo.png" alt="Toque Ideal" style={{ height: 40, width: 'auto' }} />
          {isOpen && (
            <button 
              onClick={onClose} 
              className="btn btn-ghost" 
              style={{ color: 'var(--color-text-2)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
            >
              ✕
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          <button 
            onClick={() => setShowProduction(!showProduction)} 
            className="nav-link" 
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Zap size={20} />
              <span>Fábrica</span>
            </div>
            {showProduction ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showProduction && (
            <div style={{ marginLeft: 32, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
              {sectors.map((s, index) => (
                <NavLink key={s.id} to={`/production/${s.name.toLowerCase()}`} onClick={handleLinkClick} className={({ isActive }) => `nav-link-sub ${isActive ? 'active' : ''}`}>
                  <span>{index + 1}. {STEP_LABELS[s.name.toUpperCase()] || s.name}</span>
                </NavLink>
              ))}
            </div>
          )}

          <NavLink to="/kanban" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Fila Global</span>
          </NavLink>
          <NavLink to="/" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            <span>Visão Geral</span>
          </NavLink>
          {user?.role === 'ADMIN' && (
            <>
              <NavLink to="/orders" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ClipboardList size={20} />
                <span>Entradas</span>
              </NavLink>
              <NavLink to="/production-queue" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Zap size={20} style={{ color: 'var(--color-warning)' }} />
                <span>Lançamento</span>
              </NavLink>

              <NavLink to="/order-control" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <CheckSquare size={20} />
                <span>Expedição</span>
              </NavLink>
              <NavLink to="/stock-items" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Archive size={20} />
                <span>Estoque</span>
              </NavLink>
              <NavLink to="/products" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Package size={20} />
                <span>Catálogo</span>
              </NavLink>
              <NavLink to="/clients" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users size={20} />
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/settings" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={20} />
                <span>Ajustes</span>
              </NavLink>

            </>
          )}
          <NavLink to="/alerts" onClick={handleLinkClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <div style={{ position: 'relative', display: 'flex' }}>
              <Bell size={20} />
              {alertCount > 0 && <span className="alert-badge-count">{alertCount}</span>}
            </div>
            <span>Alertas</span>
          </NavLink>
        </nav>

        <div style={{ padding: '20px 0', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '0 20px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operador:</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{user?.name || 'Administrador'}</div>
          </div>
          <button className="nav-link" onClick={() => { onLogout(); handleLinkClick(); }} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogOut size={20} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function MobileHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className="mobile-header">
      <button className="mobile-menu-btn" onClick={onOpenSidebar}>
        <Menu size={24} />
      </button>
      <div className="mobile-logo">
        <img src="/logo.png" alt="Toque Ideal" style={{ height: 28, width: 'auto' }} />
      </div>
      <div style={{ width: 24 }}></div>
    </header>
  );
}

function MobileNav({ alertCount, user, onOpenSidebar }: { alertCount: number, user: any, onOpenSidebar: () => void }) {
  useEffect(() => {
    console.log("MobileNav mounted. Screen width:", window.innerWidth);
  }, []);

  return (
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
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/orders" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
              <ClipboardList size={22} />
              <span>Entradas</span>
            </NavLink>
            <NavLink to="/order-control" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
              <CheckSquare size={22} />
              <span>Expedição</span>
            </NavLink>
          </>
        )}
        <button 
          className="mobile-nav-link" 
          onClick={onOpenSidebar}
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
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);
  const [sectors, setSectors] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      api.get('/configs/templates').then(res => setSectors(res.data.filter((t: any) => t.isActive))).catch(() => {});
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

  return (
    <BrowserRouter>
      {/* Rotas Públicas Externas (Layout sem Sidebar) */}
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg)', color: 'var(--color-text)' }}>Carregando sistema...</div>}>
        <Routes>
          <Route path="/tracking/:id" element={<PublicTrackingPage />} />
          
          {/* Rota Raiz que decide entre Login ou App */}
          <Route 
            path="/*" 
            element={
              !user ? (
                <>
                  <LoginPage onLogin={setUser} />
                  <Toaster position="top-right" />
                </>
              ) : (
                <>
                  <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} />
                  <div className="app-container">
                    <Sidebar 
                      alertCount={alertCount} 
                      onLogout={handleLogout} 
                      sectors={sectors} 
                      user={user} 
                      isOpen={sidebarOpen}
                      onClose={() => setSidebarOpen(false)}
                    />
                    
                    <main className="main-content">
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/orders" element={user?.role === 'ADMIN' ? <OrdersPage /> : <Navigate to="/" />} />
                        <Route path="/production-queue" element={user?.role === 'ADMIN' ? <ProductionQueuePage /> : <Navigate to="/" />} />

                        <Route path="/order-control" element={user?.role === 'ADMIN' ? <OrderControlPage /> : <Navigate to="/" />} />
                        <Route path="/stock-items" element={user?.role === 'ADMIN' ? <StockItemsPage /> : <Navigate to="/" />} />
                        <Route path="/kanban" element={<KanbanPage />} />
                        <Route path="/products" element={user?.role === 'ADMIN' ? <ProductsPage /> : <Navigate to="/" />} />
                        <Route path="/alerts" element={<AlertsPage onMarkRead={fetchAlertCount} />} />
                        <Route path="/clients" element={user?.role === 'ADMIN' ? <ClientsPage /> : <Navigate to="/" />} />
                        <Route path="/settings" element={user?.role === 'ADMIN' ? <SettingsPage /> : <Navigate to="/" />} />
                        <Route path="/production/:sector" element={<ProductionSectorPage />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </div>

                  <MobileNav alertCount={alertCount} user={user} onOpenSidebar={() => setSidebarOpen(true)} />
                  <Toaster position="top-right" />
                  <CommandPalette />
                </>
              )
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
