import { useEffect, useState } from 'react';
import { History, Calendar, Search, FileText, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import { STEP_LABELS } from '../types';

export default function ProductionHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/production/history', {
        params: { startDate, endDate }
      });
      setHistory(res.data);
    } catch (error) {
      toast.error('Erro ao buscar histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]);

  const filteredHistory = history.filter(step => {
    const term = searchTerm.toLowerCase();
    const productName = step.item?.productName?.toLowerCase() || '';
    const orderNumber = step.item?.order?.orderNumber?.toLowerCase() || '';
    const clientName = step.item?.order?.client?.name?.toLowerCase() || '';
    return productName.includes(term) || orderNumber.includes(term) || clientName.includes(term);
  });

  return (
    <div className="fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={28} style={{ color: 'var(--color-primary)' }} />
            Histórico de Produção
          </h1>
          <p className="page-subtitle">Acompanhe todas as etapas e peças finalizadas por período</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Data Inicial
            </label>
            <input 
              type="date" 
              className="form-input" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Data Final
            </label>
            <input 
              type="date" 
              className="form-input" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 300, marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> Buscar
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por peça, pedido ou cliente..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary" onClick={fetchHistory} style={{ height: 42 }}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-3)' }}>Carregando histórico...</div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <History size={48} style={{ color: 'var(--color-text-3)', opacity: 0.3, margin: '0 auto 16px' }} />
            <h3 style={{ color: 'var(--color-text-2)', marginBottom: 8 }}>Nenhum registro encontrado</h3>
            <p style={{ color: 'var(--color-text-3)', fontSize: 14 }}>Nenhuma etapa de produção foi finalizada neste período.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Etapa Concluída</th>
                  <th>Peça / Produto</th>
                  <th>Qtd.</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((step) => {
                  const stepLabel = STEP_LABELS[step.stepName] || step.stepName;
                  return (
                    <tr key={step.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {step.completedAt ? format(new Date(step.completedAt), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                          {step.completedAt ? format(new Date(step.completedAt), "HH:mm", { locale: ptBR }) : '-'}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          background: 'rgba(34, 197, 94, 0.1)', 
                          color: '#22c55e', 
                          padding: '4px 10px', 
                          borderRadius: 20, 
                          fontSize: 12, 
                          fontWeight: 700 
                        }}>
                          <CheckCircle2 size={14} />
                          {stepLabel}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{step.item?.productName || 'Peça Excluída'}</div>
                        {step.item?.customization && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{step.item.customization}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          display: 'inline-block',
                          fontWeight: 700
                        }}>
                          {step.completedQuantity}
                        </div>
                      </td>
                      <td>
                        {step.item?.order ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-2)', fontWeight: 600 }}>
                            <FileText size={14} style={{ color: 'var(--color-primary)' }}/>
                            {step.item.order.orderNumber}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Avulso / Estoque</span>
                        )}
                      </td>
                      <td>
                        {step.item?.order?.client ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-2)' }}>
                            <User size={14} style={{ color: 'var(--color-text-3)' }}/>
                            {step.item.order.client.name}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-3)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
