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
  Settings
} from 'lucide-react';

import { useSocket } from './hooks/useSocket';
import { STEP_LABELS } from './types';

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




function Sidebar({ alertCount, onLogout, sectors }: { alertCount: number, onLogout: () => void, sectors: any[] }) {
  const [showProduction, setShowProduction] = useState(true);
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <img src="/logo.png" alt="Toque Ideal" style={{ height: 40, width: 'auto', marginRight: 12 }} />
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
              <NavLink key={s.id} to={`/production/${s.name.toLowerCase()}`} className={({ isActive }) => `nav-link-sub ${isActive ? 'active' : ''}`}>
                <span>{index + 1}. {STEP_LABELS[s.name.toUpperCase()] || s.name}</span>
              </NavLink>
            ))}
          </div>
        )}

        <NavLink to="/kanban" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Fila Global</span>
        </NavLink>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </NavLink>
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ClipboardList size={20} />
              <span>Entradas</span>
            </NavLink>
            <NavLink to="/production-queue" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Zap size={20} style={{ color: 'var(--color-warning)' }} />
              <span>Lançamento</span>
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
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Ajustes</span>
            </NavLink>

          </>
        )}
        <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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
        <button className="nav-link" onClick={onLogout} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogOut size={20} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ alertCount, onLogout, sectors }: { alertCount: number, onLogout: () => void, sectors: any[] }) {
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
              {user?.role === 'ADMIN' && (
                <NavLink to="/stock-items" className="nav-link" onClick={() => setShowMore(false)}>
                  <Archive size={20} />
                  <span>Estoque</span>
                </NavLink>
              )}
              {user?.role === 'ADMIN' && (
                <>
                  <NavLink to="/products" className="nav-link" onClick={() => setShowMore(false)}>
                    <Package size={20} />
                    <span>Catálogo</span>
                  </NavLink>
                  <NavLink to="/clients" className="nav-link" onClick={() => setShowMore(false)}>
                    <Users size={20} />
                    <span>Clientes</span>
                  </NavLink>
                </>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 8, paddingLeft: 12 }}>SETORES DA FÁBRICA</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {sectors.map(s => (
                      <NavLink key={s.id} to={`/production/${s.name.toLowerCase()}`} className="nav-link-sub" onClick={() => setShowMore(false)}>
                        {STEP_LABELS[s.name.toUpperCase()] || s.name}
                      </NavLink>
                    ))}
                </div>
              </div>
              
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
  const [sectors, setSectors] = useState<any[]>([]);
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
                <div className="app-container">
                  <Sidebar alertCount={alertCount} onLogout={handleLogout} sectors={sectors} />
                  
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

                  <MobileNav alertCount={alertCount} onLogout={handleLogout} sectors={sectors} />
                  <Toaster position="top-right" />
                </div>
              )
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
