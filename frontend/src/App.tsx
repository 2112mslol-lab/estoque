import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import api from './services/api';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Zap, 
  Package, 
  Bell, 
  Settings, 
  Users 
} from 'lucide-react';
import { useSocket } from './hooks/useSocket';

import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import KanbanPage from './pages/KanbanPage';
import StockPage from './pages/StockPage';
import AlertsPage from './pages/AlertsPage';
import ClientsPage from './pages/ClientsPage';
import ProductsPage from './pages/ProductsPage';

function Sidebar({ alertCount }: { alertCount: number }) {
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">🪟</div>
        <div className="logo-text">Calixto Glass</div>
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink to="/kanban" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Zap size={20} />
          <span>Linha de Produção</span>
        </NavLink>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Painel Principal</span>
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ClipboardList size={20} />
          <span>Entrada de Peças</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Package size={20} />
          <span>Catálogo de Modelos</span>
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
          <span>Status e Alertas</span>
        </NavLink>
      </nav>

      <div style={{ padding: '20px 0', borderTop: '1px solid var(--color-border)' }}>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Ajustes</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default function App() {
  const [alertCount, setAlertCount] = useState(0);
  const { subscribe } = useSocket();

  const fetchAlertCount = () => {
    api.get('/alerts/count').then(res => setAlertCount(res.data.count));
  };

  useEffect(() => {
    fetchAlertCount();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('alert:new', fetchAlertCount);
    return () => { unsubscribe(); };
  }, [subscribe]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar alertCount={alertCount} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/alerts" element={<AlertsPage onMarkRead={fetchAlertCount} />} />
            <Route path="/clients" element={<ClientsPage />} />
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
