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

export default function OrderControlPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Expedição</h1>
          <p className="page-subtitle">Separação de pedidos e conferência de itens</p>
        </div>
      </div>

      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por cliente ou no. pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 40 }}>Carregando pedidos...</p>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-3)' }}>
            <ClipboardList size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>Nenhum pedido pendente de expedição</p>
          </div>
        ) : filtered.map(order => {
          const totalItems = order.items.length;
          const pickedItems = order.items.filter(i => i.isPicked).length;
          const isFinished = order.status === 'FINISHED';
          const allCompletedInProduction = order.items.every(i => i.status === 'COMPLETED');

          return (
            <div key={order.id} className="card shadow-premium" style={{ borderLeft: `6px solid ${isFinished ? 'var(--color-success)' : 'var(--color-border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-1)' }}>{order.orderNumber}</span>
                    {isFinished && <span className="badge badge-success">CONCLUÍDO</span>}
                    {!isFinished && !allCompletedInProduction && <span className="badge badge-warning">EM PRODUÇÃO</span>}
                    {!isFinished && allCompletedInProduction && <span className="badge badge-primary">PRONTO P/ EXPEDIÇÃO</span>}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{order.client.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    Entrega: {format(new Date(order.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>CHECKLIST</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: pickedItems === totalItems ? 'var(--color-success)' : 'var(--color-text-1)' }}>
                    {pickedItems} / {totalItems}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
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
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                        {item.status === 'COMPLETED' ? '📦 Embalado' : '⚙️ Em Produção'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
