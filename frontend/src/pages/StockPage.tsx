import { useEffect, useState } from 'react';
import { 
  Package
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import type { StockMaterial } from '../types';
import { UNIT_LABELS } from '../types';

export default function StockPage() {
  const [materials, setMaterials] = useState<StockMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  const fetchStock = async () => {
    try {
      const res = await api.get<StockMaterial[]>('/stock');
      setMaterials(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  useEffect(() => {
    const unsub = subscribe('stock:updated', fetchStock);
    return () => { unsub(); };
  }, [subscribe]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estoque de Materiais</h1>
          <p className="page-subtitle">Rastreamento de insumos e chapas</p>
        </div>
      </div>

      <div className="grid-stats">
        {loading ? <p>Carregando estoque...</p> : materials.map(mat => (
          <div key={mat.id} className="card" style={{ borderLeft: `4px solid ${Number(mat.currentStock) <= Number(mat.minimumStock) ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Package size={16} style={{ color: 'var(--color-primary)' }} />
                 <div style={{ fontWeight: 700, fontSize: 16 }}>{mat.name}</div>
              </div>
              <div style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 700, color: 'var(--color-text-2)' }}>
                {UNIT_LABELS[mat.unit] || mat.unit}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: Number(mat.currentStock) <= Number(mat.minimumStock) ? 'var(--color-danger)' : 'var(--color-text-1)' }}>
              {Number(mat.currentStock).toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>Lote Mínimo: {Number(mat.minimumStock).toFixed(1)}</span>
              {Number(mat.currentStock) <= Number(mat.minimumStock) && <span style={{ color: 'var(--color-danger)', fontWeight: 800 }}>⚠️ REPOR CABINE</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
