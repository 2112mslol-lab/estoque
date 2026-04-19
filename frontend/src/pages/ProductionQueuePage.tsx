import { useEffect, useState } from 'react';
import { 
  Play, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Search,
  CheckCircle,
  Clock,
  Zap
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

  const fetchBacklog = async () => {
    try {
      const res = await api.get('/production/backlog');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBacklog(); }, []);

  const handleStartProduction = async (id: string) => {
    try {
      await api.post(`/production/start/${id}`);
      toast.success('PEÇA ENVIADA PARA A FÁBRICA! 🚀');
      fetchBacklog();
    } catch (err) {
      toast.error('Erro ao iniciar produção');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Trocar posições
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Atualizar ranks localmente
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
          <p className="page-subtitle">Defina a prioridade manual e envie para os setores da fábrica.</p>
        </div>
        <div className="card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
           <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>{items.length}</span>
           <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>PEÇAS AGUARDANDO</span>
        </div>
      </div>

      <div className="card mb-6 shadow-premium">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 44, height: 48 }}
            placeholder="Filtrar por pedido, cliente ou modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container shadow-premium">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Prioridade</th>
              <th>Informações da Peça</th>
              <th>Cliente</th>
              <th>Data de Entrega</th>
              <th>Lançado em</th>
              <th style={{ textAlign: 'center' }}>Ação de Comando</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>Carregando fila de espera...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 100, color: 'var(--color-text-3)' }}>
                  <CheckCircle size={60} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
                  <h3>Tudo certo! Não há peças pendentes de lançamento.</h3>
                </td>
              </tr>
            ) : filteredItems.map((item, index) => {
              const deliverIn = Math.ceil((new Date(item.order.deliveryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
              
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                       <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 8, 
                        background: index === 0 ? 'var(--color-warning)' : 'var(--color-surface-3)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: index === 0 ? 'black' : 'var(--color-text-1)',
                        border: '1px solid var(--color-border)'
                       }}>
                         {index + 1}º
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: 2, visibility: index === 0 ? 'hidden' : 'visible' }} 
                            onClick={() => handleMove(index, 'up')}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: 2, visibility: index === filteredItems.length - 1 ? 'hidden' : 'visible' }} 
                            onClick={() => handleMove(index, 'down')}
                          >
                            <ArrowDown size={14} />
                          </button>
                       </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-primary)' }}>#{item.order.orderNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.quantity}x {item.productName}</div>
                    {item.customization && <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Obs: {item.customization}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.order.client.name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <Clock size={16} style={{ color: deliverIn <= 2 ? 'var(--color-danger)' : 'var(--color-text-3)' }} />
                       <span style={{ fontWeight: 700, color: deliverIn <= 2 ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
                        {format(new Date(item.order.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}
                       </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', marginTop: 4 }}>
                      {deliverIn < 0 ? 'ATRASADO há ' + Math.abs(deliverIn) + ' dias' : 'em ' + deliverIn + ' dias'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                    {format(new Date(item.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-warning" 
                      onClick={() => handleStartProduction(item.id)}
                      style={{ padding: '10px 20px', borderRadius: 12, fontWeight: 800, color: 'black' }}
                    >
                      <Play size={18} fill="currentColor" /> INICIAR NA FÁBRICA
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 40, padding: 24, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 20, border: '1px dashed var(--color-primary)', display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Zap size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Dica de Gestão</h4>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Use as setas para definir a ordem exata de execução. O item que estiver no topo (1º) será o primeiro a aparecer para os funcionários nos tablets ou telões de todos os setores produtivos.
            </p>
          </div>
      </div>
    </div>
  );
}
