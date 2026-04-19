import { useEffect, useState } from 'react';
import { 
  Play, 
  Search,
  CheckCircle,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BacklogItem {
  id: string;
  productName: string;
  quantity: number;
  customization?: string;
  priorityRank: number;
  createdAt: string;
  order: {
    orderNumber: string;
    deliveryDate: string;
    client: { name: string };
  };
}

export default function ProductionQueuePage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startQuantities, setStartQuantities] = useState<Record<string, number>>({});

  const fetchBacklog = async () => {
    try {
      const res = await api.get('/production/backlog');
      setItems(res.data);
      
      // Inicializar as quantidades com o total
      const qtys: Record<string, number> = {};
      res.data.forEach((it: BacklogItem) => {
        qtys[it.id] = it.quantity;
      });
      setStartQuantities(qtys);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBacklog(); }, []);

  const handleStartProduction = async (id: string) => {
    const qty = startQuantities[id];
    if (!qty || qty <= 0) return toast.error('Quantidade inválida');

    try {
      await api.post(`/production/start/${id}`, { quantity: qty });
      toast.success(`LANÇADO: ${qty} UNIDADES NA FÁBRICA! 🚀`);
      fetchBacklog();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar produção');
    }
  };

  const handleQtyChange = (id: string, val: string, max: number) => {
    const n = Math.max(1, Math.min(max, parseInt(val) || 1));
    setStartQuantities({ ...startQuantities, [id]: n });
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const updated = newItems.map((it, idx) => ({ id: it.id, rank: idx + 1 }));
    setItems(newItems.map((it, idx) => ({ ...it, priorityRank: idx + 1 })));

    try {
      await api.put('/production/reorder', { items: updated });
    } catch (err) {
      toast.error('Erro ao salvar nova ordem');
      fetchBacklog();
    }
  };

  const filteredItems = items.filter(it => 
    it.productName.toLowerCase().includes(search.toLowerCase()) ||
    it.order.client.name.toLowerCase().includes(search.toLowerCase()) ||
    it.order.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <Zap size={32} style={{ color: 'var(--color-warning)' }} />
             Fila de Lançamento (Backlog)
          </h1>
          <p className="page-subtitle">Puxe peças dos pedidos e envie para a fábrica com a quantidade desejada.</p>
        </div>
        <div className="card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
           <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>{items.length}</span>
           <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>FILA DE ESPERA</span>
        </div>
      </div>

      <div className="card mb-6 shadow-premium">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 44, height: 48 }}
            placeholder="Filtrar pedidos ou modelos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container shadow-premium">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Fila</th>
              <th>Informações da Peça</th>
              <th>Cliente</th>
              <th>Entrega</th>
              <th style={{ textAlign: 'center' }}>Qtd. para Lançar</th>
              <th style={{ textAlign: 'center' }}>Comando</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>Carregando fila...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 100, color: 'var(--color-text-3)' }}>
                  <CheckCircle size={60} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
                  <h3>Nada pendente para produção.</h3>
                </td>
              </tr>
            ) : filteredItems.map((item, index) => {
              const deliverIn = Math.ceil((new Date(item.order.deliveryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
              
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <div style={{ 
                        width: 32, height: 32, borderRadius: 8, 
                        background: index === 0 ? 'var(--color-warning)' : 'var(--color-surface-3)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, color: index === 0 ? 'black' : 'var(--color-text-1)',
                        border: '1px solid var(--color-border)'
                       }}>
                         {index + 1}º
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button className="btn-ghost" style={{ padding: 2, visibility: index === 0 ? 'hidden' : 'visible' }} onClick={() => handleMove(index, 'up')}><ArrowUp size={14} /></button>
                          <button className="btn-ghost" style={{ padding: 2, visibility: index === filteredItems.length - 1 ? 'hidden' : 'visible' }} onClick={() => handleMove(index, 'down')}><ArrowDown size={14} /></button>
                       </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-primary)' }}>#{item.order.orderNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.quantity}x {item.productName}</div>
                    {item.customization && <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Obs: {item.customization}</div>}
                  </td>
                  <td>{item.order.client.name}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: deliverIn <= 2 ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
                        {format(new Date(item.order.deliveryDate), "dd/MM", { locale: ptBR })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                      <input 
                        type="number"
                        className="form-input" 
                        style={{ width: 60, height: 32, textAlign: 'center', fontSize: 16, fontWeight: 800, padding: 0 }}
                        value={startQuantities[item.id] || 0}
                        onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>/ {item.quantity}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-warning" 
                      onClick={() => handleStartProduction(item.id)}
                      style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 800, color: 'black', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
                    >
                      <Play size={14} fill="currentColor" /> LANÇAR
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
