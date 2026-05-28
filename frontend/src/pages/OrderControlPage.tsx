import { useEffect, useState } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  Circle,
  Search,
  Package,
  CheckCircle,
  Truck
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import type { Order } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomizationBadge } from '../components/CustomizationBadge';

export default function OrderControlPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterReadiness, setFilterReadiness] = useState<string>('ALL');
  const { subscribe } = useSocket();

  const fetchOrders = async () => {
    try {
      // Buscamos pedidos que não foram entregues ainda
      const res = await api.get<Order[]>('/orders');
      // Filtramos apenas os que não estão DELIVERED ou CANCELLED
      const active = res.data.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
      setOrders(active);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const unsub = subscribe('order:new', fetchOrders);
    const unsub2 = subscribe('production:step-updated', fetchOrders);
    const unsub3 = subscribe('order:updated', fetchOrders);
    return () => { unsub(); unsub2(); unsub3(); };
  }, [subscribe]);

  const togglePick = async (itemId: string, current: boolean) => {
    try {
      await api.put(`/orders/items/${itemId}/pick`, { isPicked: !current });
      toast.success(current ? 'Item removido da separação' : 'Item marcado como separado!');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao atualizar item');
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'DELIVERED' });
      toast.success('Pedido despachado e entregue com sucesso!');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao despachar pedido. Verifique suas permissões.');
    }
  };

  const filtered = orders
    .filter(o => {
      const clientName = o.client?.name || o.notes?.split('\n').find((l: string) => l.startsWith('Cliente:'))?.replace('Cliente:', '').trim() || '';
      return o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
             clientName.toLowerCase().includes(search.toLowerCase());
    })
    .filter(o => {
      if (filterReadiness === 'ALL') return true;
      const allCompletedInProduction = o.items.every(i => i.status === 'COMPLETED');
      if (filterReadiness === 'READY') return allCompletedInProduction;
      if (filterReadiness === 'PRODUCTION') return !allCompletedInProduction;
      return true;
    });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    // 1. Prioritário no topo
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;

    // 2. Prontos para expedição no topo
    const aReady = a.items.every(i => i.status === 'COMPLETED');
    const bReady = b.items.every(i => i.status === 'COMPLETED');
    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;

    // 3. Data de entrega mais próxima primeiro
    const aDate = new Date(a.deliveryDate).getTime();
    const bDate = new Date(b.deliveryDate).getTime();
    if (aDate !== bDate) return aDate - bDate;

    // 4. Data de criação
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Expedição</h1>
          <p className="page-subtitle">Separação de pedidos e conferência de itens</p>
        </div>
      </div>

      <div className="card mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', minWidth: 300, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36, marginTop: 0 }}
            placeholder="Buscar por cliente ou no. pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Prontidão:</span>
          <select 
            className="form-input" 
            style={{ width: 180, marginTop: 0, padding: '8px 12px', height: 38 }}
            value={filterReadiness}
            onChange={e => setFilterReadiness(e.target.value)}
          >
            <option value="ALL">Todos os Pedidos</option>
            <option value="READY">Prontos p/ Expedição</option>
            <option value="PRODUCTION">Em Produção</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 40 }}>Carregando pedidos...</p>
        ) : sortedAndFiltered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-3)' }}>
            <ClipboardList size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>Nenhum pedido pendente de expedição</p>
          </div>
        ) : sortedAndFiltered.map(order => {
          const totalItems = order.items.length;
          const pickedItems = order.items.filter(i => i.isPicked).length;
          const isFinished = order.status === 'FINISHED';
          const allCompletedInProduction = order.items.every(i => i.status === 'COMPLETED');

          return (
            <div 
              key={order.id} 
              className="card shadow-premium" 
              style={{ 
                borderLeft: order.isPriority ? '6px solid var(--color-warning)' : `6px solid ${isFinished ? 'var(--color-success)' : 'var(--color-border)'}`,
                boxShadow: order.isPriority ? '0 4px 20px rgba(245, 158, 11, 0.1)' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-1)' }}>{order.orderNumber}</span>
                    {order.isPriority && (
                      <span style={{ fontSize: 10, background: 'var(--color-warning)', color: 'black', padding: '3px 8px', borderRadius: 4, fontWeight: 900 }}>
                        ★ PRIORITÁRIO
                      </span>
                    )}
                    {isFinished && <span className="badge badge-success">CONCLUÍDO</span>}
                    {!isFinished && !allCompletedInProduction && <span className="badge badge-warning">EM PRODUÇÃO</span>}
                    {!isFinished && allCompletedInProduction && <span className="badge badge-primary">PRONTO P/ EXPEDIÇÃO</span>}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{order.client?.name || order.notes?.split('\n').find((l: string) => l.startsWith('Cliente:'))?.replace('Cliente:', '').trim() || 'Desconhecido'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    Entrega: {format(new Date(order.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>CONFERIDO</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: pickedItems === totalItems ? 'var(--color-success)' : 'var(--color-text-1)' }}>
                    {pickedItems} / {totalItems}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: (allCompletedInProduction || isFinished) ? 20 : 0 }}>
                {order.items.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => togglePick(item.id, item.isPicked)}
                    style={{ 
                      padding: '12px 16px', 
                      background: item.isPicked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${item.isPicked ? 'var(--color-success)' : 'var(--color-border)'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                    className="hover-scale"
                  >
                    {item.isPicked ? 
                      <CheckCircle2 size={22} style={{ color: 'var(--color-success)' }} /> : 
                      <Circle size={22} style={{ color: 'var(--color-text-3)' }} />
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: item.isPicked ? 'var(--color-text-1)' : 'var(--color-text-2)' }}>
                        {item.quantity}x {item.productName}
                      </div>
                      <CustomizationBadge text={item.customization} />
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                        {item.status === 'COMPLETED' ? '📦 Embalado / Pronto' : '⚙️ Em Produção'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de Despacho/Entrega Direta */}
              {(allCompletedInProduction || isFinished) && (
                <div style={{ display: 'flex', gap: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      padding: '12px 20px', 
                      fontSize: 14,
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                    }}
                    onClick={() => handleDeliverOrder(order.id)}
                  >
                    <Truck size={18} /> Despachar / Entregar Pedido
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
