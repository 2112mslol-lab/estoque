import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Terminal, 
  ArrowRight, 
  Zap, 
  ClipboardList, 
  Package, 
  Archive, 
  Users, 
  Settings, 
  Bell, 
  LayoutDashboard,
  CheckSquare,
  Clock
} from 'lucide-react';
import api from '../services/api';
import type { Order, Client } from '../types';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navegação' | 'Ações' | 'Pedidos';
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Listen for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setViewingOrder(null);
        setSearch('');
      } else if (e.key === 'Escape') {
        if (viewingOrder) {
          setViewingOrder(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingOrder]);

  // Load search data when palette is opened
  useEffect(() => {
    if (isOpen) {
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);

      // Fetch active orders & sectors
      api.get<Order[]>('/orders').then(res => setOrders(res.data)).catch(() => {});
      api.get('/configs/templates').then(res => setSectors(res.data.filter((t: any) => t.isActive))).catch(() => {});
    }
  }, [isOpen]);

  const defaultCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Ir para Visão Geral (Dashboard)',
      category: 'Navegação',
      icon: <LayoutDashboard size={16} />,
      action: () => { navigate('/'); setIsOpen(false); }
    },
    {
      id: 'nav-orders',
      title: 'Ir para Entradas & Logística',
      category: 'Navegação',
      icon: <ClipboardList size={16} />,
      action: () => { navigate('/orders'); setIsOpen(false); }
    },
    {
      id: 'nav-kanban',
      title: 'Ir para Linha de Produção (Kanban)',
      category: 'Navegação',
      icon: <Package size={16} />,
      action: () => { navigate('/kanban'); setIsOpen(false); }
    },
    {
      id: 'nav-backlog',
      title: 'Ir para Fila de Lançamento',
      category: 'Navegação',
      icon: <Zap size={16} style={{ color: 'var(--color-warning)' }} />,
      action: () => { navigate('/production-queue'); setIsOpen(false); }
    },
    {
      id: 'nav-shipping',
      title: 'Ir para Expedição',
      category: 'Navegação',
      icon: <CheckSquare size={16} />,
      action: () => { navigate('/order-control'); setIsOpen(false); }
    },
    {
      id: 'nav-stock',
      title: 'Ir para Controle de Estoque',
      category: 'Navegação',
      icon: <Archive size={16} />,
      action: () => { navigate('/stock-items'); setIsOpen(false); }
    },
    {
      id: 'nav-clients',
      title: 'Ir para Clientes',
      category: 'Navegação',
      icon: <Users size={16} />,
      action: () => { navigate('/clients'); setIsOpen(false); }
    },
    {
      id: 'nav-settings',
      title: 'Ir para Ajustes & Etapas',
      category: 'Navegação',
      icon: <Settings size={16} />,
      action: () => { navigate('/settings'); setIsOpen(false); }
    },
    {
      id: 'nav-alerts',
      title: 'Ir para Central de Alertas',
      category: 'Navegação',
      icon: <Bell size={16} />,
      action: () => { navigate('/alerts'); setIsOpen(false); }
    }
  ];

  // Dynamic sector navigation
  const sectorCommands: CommandItem[] = sectors.map((s, index) => ({
    id: `nav-sector-${s.id}`,
    title: `Ir para Setor de ${s.name} (${index + 1})`,
    category: 'Navegação',
    icon: <Zap size={16} />,
    action: () => { navigate(`/production/${s.name.toLowerCase()}`); setIsOpen(false); }
  }));

  // Dynamic order search
  const orderCommands: CommandItem[] = orders
    .filter(o => 
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      o.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
    )
    .slice(0, 5)
    .map(o => ({
      id: `order-${o.id}`,
      title: `Pedido ${o.orderNumber} - ${o.client?.name || 'Estoque'} (${o.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')})`,
      category: 'Pedidos',
      icon: <ClipboardList size={16} style={{ color: 'var(--color-primary)' }} />,
      action: () => { setViewingOrder(o); }
    }));

  const allFilteredItems = [
    ...defaultCommands.filter(c => c.title.toLowerCase().includes(search.toLowerCase())),
    ...sectorCommands.filter(c => c.title.toLowerCase().includes(search.toLowerCase())),
    ...orderCommands
  ];

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (viewingOrder) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allFilteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allFilteredItems.length) % allFilteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFilteredItems[selectedIndex]) {
        allFilteredItems[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return (
    <button 
      className="btn btn-secondary shadow-premium" 
      onClick={() => setIsOpen(true)}
      style={{ 
        position: 'fixed', 
        bottom: 90, 
        right: 24, 
        zIndex: 999, 
        borderRadius: 30, 
        padding: '12px 20px', 
        gap: 8,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(30, 35, 45, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}
    >
      <Terminal size={18} style={{ color: 'var(--color-primary)' }} />
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>Buscar ou Ir... <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, marginLeft: 6, fontSize: 10 }}>Ctrl+K</kbd></span>
    </button>
  );

  return (
    <div 
      className="modal-overlay" 
      style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '10vh', zIndex: 9999 }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="modal shadow-premium" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: 600, 
          background: 'rgba(18, 21, 28, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          borderRadius: 16,
          overflow: 'hidden'
        }}
      >
        {!viewingOrder ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Search size={20} style={{ color: 'var(--color-text-3)', marginRight: 14 }} />
              <input 
                ref={inputRef}
                type="text" 
                className="form-input" 
                placeholder="Digite para buscar páginas, setores ou pedidos..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: 0, 
                  marginTop: 0, 
                  height: 'auto',
                  fontSize: 16,
                  color: '#fff',
                  boxShadow: 'none'
                }}
              />
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, color: 'var(--color-text-3)' }}>ESC</span>
            </div>

            <div 
              ref={listRef}
              style={{ 
                maxHeight: 380, 
                overflowY: 'auto', 
                padding: '8px 0' 
              }}
            >
              {allFilteredItems.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 14 }}>
                  Nenhum resultado encontrado para "{search}"
                </div>
              ) : (
                allFilteredItems.reduce((acc: any[], item, index) => {
                  // Print category label
                  const prevItem = allFilteredItems[index - 1];
                  if (!prevItem || prevItem.category !== item.category) {
                    acc.push(
                      <div 
                        key={`cat-${item.category}`}
                        style={{ 
                          fontSize: 10, 
                          fontWeight: 800, 
                          color: 'var(--color-primary)', 
                          letterSpacing: '0.08em', 
                          padding: '12px 20px 4px', 
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.category}
                      </div>
                    );
                  }

                  const isSelected = index === selectedIndex;

                  acc.push(
                    <div 
                      key={item.id}
                      data-active={isSelected}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 20px', 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: isSelected ? '#fff' : 'var(--color-text-2)',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-3)' }}>{item.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500 }}>{item.title}</span>
                      </div>
                      {isSelected && <ArrowRight size={14} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  );

                  return acc;
                }, [])
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Pedido {viewingOrder.orderNumber}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Cliente: {viewingOrder.client?.name || 'Venda Avulsa / Estoque'}</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewingOrder(null)}>Voltar</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {viewingOrder.items.map((item, idx) => (
                <div key={idx} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.quantity}x {item.productName}</span>
                    <span style={{ 
                      fontSize: 10, 
                      padding: '2px 8px', 
                      borderRadius: 6,
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)'
                    }}>
                      {item.status === 'COMPLETED' ? 'Pronto' : 'Em Produção'}
                    </span>
                  </div>
                  {item.customization && <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Obs: {item.customization}</div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigate(`/orders`);
                  setIsOpen(false);
                }}
              >
                Gerenciar Pedido
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
