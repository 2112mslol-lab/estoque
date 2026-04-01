import { useEffect, useState } from 'react';
import { 
  Package, 
  Clock, 
  PlayCircle, 
  CheckCircle2 
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface ProductStock {
  id: string;
  name: string;
  pending: number;
  production: number;
  packaged: number;
}

export default function StockItemsPage() {
  const [data, setData] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  const fetchData = async () => {
    try {
      const res = await api.get<ProductStock[]>('/stock/items');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Escutar atualizações de produção para atualizar o estoque em tempo real
    const unsub = subscribe('production:step-updated', fetchData);
    const unsub2 = subscribe('order:item-picked', fetchData);
    return () => { unsub(); unsub2(); };
  }, [subscribe]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Estoque</h1>
          <p className="page-subtitle">Acompanhamento das peças por estágio atual</p>
        </div>
      </div>

      <div className="table-container shadow-premium">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}><Package size={16} /></th>
              <th>Modelo / Peça</th>
              <th style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-warning)' }}>
                   <Clock size={16} /> Pendente
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-primary)' }}>
                   <PlayCircle size={16} /> Produção
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-success)' }}>
                   <CheckCircle2 size={16} /> Embalado
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Carregando dados...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhuma peça em fluxo no momento</td></tr>
            ) : data.map(item => (
              <tr key={item.id}>
                <td><Package size={18} style={{ opacity: 0.3 }} /></td>
                <td style={{ fontWeight: 700, color: 'var(--color-text-1)', fontSize: 16 }}>{item.name}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: 24, 
                    fontWeight: 800, 
                    color: item.pending > 0 ? 'var(--color-warning)' : 'var(--color-text-3)',
                    opacity: item.pending > 0 ? 1 : 0.2
                  }}>
                    {item.pending}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: 24, 
                    fontWeight: 800, 
                    color: item.production > 0 ? 'var(--color-primary)' : 'var(--color-text-3)',
                    opacity: item.production > 0 ? 1 : 0.2
                  }}>
                    {item.production}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: 24, 
                    fontWeight: 800, 
                    color: item.packaged > 0 ? 'var(--color-success)' : 'var(--color-text-3)',
                    opacity: item.packaged > 0 ? 1 : 0.2
                  }}>
                    {item.packaged}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-stats" style={{ marginTop: 24 }}>
        <div className="card-stat">
          <div className="stat-label">Total em Fluxo</div>
          <div className="stat-value">{data.reduce((acc, i) => acc + i.pending + i.production + i.packaged, 0)}</div>
        </div>
        <div className="card-stat">
          <div className="stat-label">Total Embalado</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{data.reduce((acc, i) => acc + i.packaged, 0)}</div>
        </div>
      </div>
    </div>
  );
}
