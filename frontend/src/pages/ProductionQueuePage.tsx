import { useEffect, useState } from 'react';
import { 
  Play, 
  Search,
  CheckCircle,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Product } from '../types';

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
    isPriority: boolean;
    client: { name: string };
  };
}

export default function ProductionQueuePage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startQuantities, setStartQuantities] = useState<Record<string, number>>({});
  
  // Filtros e Ordenação
  const [filterPriority, setFilterPriority] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<string>('DELIVERY_DATE_ASC');

  // Estados para Produção Manual
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ productId: '', quantity: 1 });

  const fetchData = async () => {
    try {
      const [backlogRes, productsRes] = await Promise.all([
        api.get('/production/backlog'),
        api.get('/products')
      ]);
      setItems(backlogRes.data);
      setProducts(productsRes.data);
      
      const qtys: Record<string, number> = {};
      backlogRes.data.forEach((it: BacklogItem) => {
        qtys[it.id] = it.quantity;
      });
      setStartQuantities(qtys);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStartProduction = async (id: string) => {
    const qty = startQuantities[id];
    try {
      await api.post(`/production/start/${id}`, { quantity: qty });
      toast.success(`LANÇADO: ${qty} UNIDADES! 🚀`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar');
    }
  };

  const handleManualLaunch = async () => {
    if (!manualForm.productId) return toast.error('Selecione um produto');
    try {
      await api.post('/production/manual-launch', manualForm);
      toast.success('PRODUÇÃO AVULSA LANÇADA! 🛠️');
      setShowManual(false);
      fetchData();
    } catch (err) {
      toast.error('Erro ao lançar manual');
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
      toast.error('Erro ao reordenar');
      fetchData();
    }
  };

  const filteredItems = items
    .filter(it => 
      it.productName.toLowerCase().includes(search.toLowerCase()) ||
      (it.order?.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      it.order?.orderNumber.toLowerCase().includes(search.toLowerCase())
    )
    .filter(it => filterPriority === null || it.order?.isPriority === filterPriority)
    .sort((a, b) => {
      if (sortBy === 'DELIVERY_DATE_ASC') {
        return new Date(a.order.deliveryDate).getTime() - new Date(b.order.deliveryDate).getTime();
      } else if (sortBy === 'DELIVERY_DATE_DESC') {
        return new Date(b.order.deliveryDate).getTime() - new Date(a.order.deliveryDate).getTime();
      } else if (sortBy === 'QUANTITY_DESC') {
        return b.quantity - a.quantity;
      } else if (sortBy === 'QUANTITY_ASC') {
        return a.quantity - b.quantity;
      }
      return 0;
    });

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <Zap size={32} style={{ color: 'var(--color-warning)' }} />
             Fila de Lançamento
          </h1>
          <p className="page-subtitle">Puxe itens para a fábrica. O sistema fará a entrega inteligente no final.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setShowManual(true)}>
             <Plus size={18} /> Produção Livre (Estoque)
          </button>
          <div className="card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--color-warning)' }}>
             <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>{items.length}</span>
             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>FILA DE ESPERA</span>
          </div>
        </div>
      </div>

      <div className="card mb-6 shadow-premium" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', minWidth: 300, flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 44, height: 48, marginTop: 0 }}
            placeholder="Filtrar pedidos ou modelos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Prioridade:</span>
            <select 
              className="form-input" 
              style={{ width: 130, marginTop: 0, padding: '8px 12px', height: 38 }}
              value={filterPriority === null ? 'ALL' : filterPriority ? 'PRIORITY' : 'NORMAL'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'ALL') setFilterPriority(null);
                else if (val === 'PRIORITY') setFilterPriority(true);
                else setFilterPriority(false);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="PRIORITY">Prioritários</option>
              <option value="NORMAL">Normais</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Ordenar por:</span>
            <select 
              className="form-input" 
              style={{ width: 180, marginTop: 0, padding: '8px 12px', height: 38 }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="DELIVERY_DATE_ASC">Data de Entrega (Crescente)</option>
              <option value="DELIVERY_DATE_DESC">Data de Entrega (Decrescente)</option>
              <option value="QUANTITY_DESC">Qtd. a Produzir (Decrescente)</option>
              <option value="QUANTITY_ASC">Qtd. a Produzir (Crescente)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container shadow-premium">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Fila</th>
              <th>⭐</th>
              <th>Informações da Peça</th>
              <th>Entrega</th>
              <th style={{ textAlign: 'center' }}>Qtd. p/ Lançar</th>
              <th style={{ textAlign: 'center' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>Sincronizando fila...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 100, color: 'var(--color-text-3)' }}>
                  <CheckCircle size={60} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
                  <h3>Fila de espera vazia.</h3>
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
                    {item.order.isPriority && <Zap size={16} fill="var(--color-warning)" stroke="var(--color-warning)" />}
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-primary)' }}>#{item.order.orderNumber}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.quantity}x {item.productName}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: deliverIn <= 2 ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
                        {format(new Date(item.order.deliveryDate), "dd/MM", { locale: ptBR })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                      <input 
                        type="number"
                        className="form-input" 
                        style={{ width: 50, height: 28, textAlign: 'center', fontSize: 14, fontWeight: 800, padding: 0 }}
                        value={startQuantities[item.id] || 0}
                        onChange={(e) => handleQtyChange(item.id, e.target.value, item.quantity)}
                      />
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>/ {item.quantity}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-warning" onClick={() => handleStartProduction(item.id)} style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 800, color: 'black', fontSize: 11 }}>
                      <Play size={14} fill="black" /> LANÇAR
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL LANÇAMENTO MANUAL/ESTOQUE */}
      {showManual && (
        <div className="modal-overlay" onClick={() => setShowManual(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
             <div className="modal-header">
                <h2 className="modal-title">Lançamento de Estoque</h2>
                <button className="btn btn-ghost" onClick={() => setShowManual(false)}><X size={20}/></button>
             </div>
             <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
                  Inicie uma produção manual independente de pedidos. O sistema alocalá estas peças automaticamente na Embalagem.
                </p>
                <div className="form-group">
                  <label className="form-label">Produto / Modelo</label>
                  <select className="form-input" value={manualForm.productId} onChange={e => setManualForm({...manualForm, productId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantidade para Criar</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" 
                    value={manualForm.quantity}
                    onChange={e => setManualForm({...manualForm, quantity: parseInt(e.target.value) || 1})}
                  />
                </div>
             </div>
             <div className="modal-footer">
                <button className="btn btn-primary w-full" style={{ padding: 14 }} onClick={handleManualLaunch}>
                  <Package size={18} /> INICIAR PRODUÇÃO DESVINCULADA
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
