import { useEffect, useState } from 'react';
import { 
  Package, 
  Clock, 
  PlayCircle, 
  CheckCircle2,
  Search,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface ProductStock {
  id: string;
  name: string;
  pending: number;
  production: number;
  packaged: number;
  freeStock: number;
}

interface Material {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  isLowStock: boolean;
}

export default function StockItemsPage() {
  const [data, setData] = useState<ProductStock[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { subscribe } = useSocket();

  const fetchData = async () => {
    try {
      const [stockRes, materialsRes] = await Promise.all([
        api.get<ProductStock[]>('/stock/items'),
        api.get<Material[]>('/stock/low')
      ]);
      setData(stockRes.data);
      setMaterials(materialsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsub = subscribe('production:step-updated', fetchData);
    const unsub2 = subscribe('order:item-picked', fetchData);
    const unsub3 = subscribe('stock:updated', fetchData);
    return () => { unsub(); unsub2(); unsub3(); };
  }, [subscribe]);

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Mapa de Estoque & Produção</h1>
          <p className="page-subtitle">Visão 360º de todas as peças e insumos da fábrica</p>
        </div>
      </div>

      <div className="grid-stock">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* SEARCH & FILTERS */}
          <div className="card shadow-premium" style={{ padding: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
              <input 
                className="form-input" 
                style={{ paddingLeft: 44, height: 48, background: 'rgba(255,255,255,0.02)' }}
                placeholder="Buscar modelo, peça ou coleção..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* STOCK TABLE */}
          <div className="table-container shadow-premium">
            <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, border: 'none' }}><Layers size={16} /></th>
                  <th style={{ border: 'none' }}>MODELO / PEÇA</th>
                  <th style={{ textAlign: 'center', border: 'none' }}>NO BACKLOG</th>
                  <th style={{ textAlign: 'center', border: 'none' }}>EM FÁBRICA</th>
                  <th style={{ textAlign: 'center', border: 'none' }}>RESERVADO</th>
                  <th style={{ textAlign: 'center', border: 'none', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px 8px 0 0' }}>ESTOQUE LIVRE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60 }}>Sincronizando inventário...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-3)' }}>Nenhum item encontrado.</td></tr>
                ) : filteredData.map(item => (
                  <tr key={item.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                    <td style={{ padding: '16px 12px' }}><Package size={20} style={{ color: 'var(--color-primary)', opacity: 0.6 }} /></td>
                    <td style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-1)' }}>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: item.pending > 0 ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
                        {item.pending}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: item.production > 0 ? 'var(--color-warning)' : 'var(--color-text-3)' }}>
                        {item.production}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: item.packaged > 0 ? 'var(--color-success)' : 'var(--color-text-3)' }}>
                        {item.packaged}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: item.freeStock > 0 ? '#fbbf24' : 'var(--color-text-3)' }}>
                        {item.freeStock}
                      </div>
                      {item.freeStock > 0 && <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', marginTop: -4 }}>PRONTA ENTREGA</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDEBAR: LOW MATERIALS */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card shadow-premium" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), transparent)', border: '1px solid rgba(239,68,68,0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-danger)' }}>Insumos Críticos</h3>
             </div>
             
             {materials.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.4 }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12 }}>Tudo ok com os materiais.</p>
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {materials.map(m => (
                   <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 800 }}>REPOR URGENTE</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{Number(m.currentStock).toFixed(1)}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>{m.unit}</div>
                      </div>
                   </div>
                 ))}
                 <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', border: '1px solid var(--color-danger)' }}>
                    Comprar Materiais <ArrowRight size={14} />
                 </button>
               </div>
             )}
          </div>

          <div className="card shadow-premium" style={{ background: 'var(--color-surface-2)' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Legenda Técnica</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                   <div style={{ width: 4, height: 40, background: 'var(--color-danger)', borderRadius: 2 }} />
                   <div>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>BACKLOG</div>
                      <p style={{ fontSize: 10, color: 'var(--color-text-3)' }}>Pedidos aprovados aguardando autorização para entrar na fábrica.</p>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                   <div style={{ width: 4, height: 40, background: '#fbbf24', borderRadius: 2 }} />
                   <div>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>ESTOQUE LIVRE</div>
                      <p style={{ fontSize: 10, color: 'var(--color-text-3)' }}>Peças finalizadas que NÃO possuem pedido. Disponíveis para venda.</p>
                   </div>
                </div>
             </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
