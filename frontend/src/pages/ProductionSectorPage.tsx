import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Clock, 
  RefreshCw,
  Package,
  CheckCircle2,
  Hash,
  PlusCircle,
  X,
  Play
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { ProductionStep, Order } from '../types';
import { STEP_LABELS, STEP_COLORS, STEP_EMOJIS } from '../types';
import api from '../services/api';

export default function ProductionSectorPage() {
  const { sector } = useParams<{ sector: string }>();
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Entrada Manual
  const [showManual, setShowManual] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [manualForm, setManualForm] = useState({
    itemId: '',
    quantity: 1
  });

  const stepName = sector?.toUpperCase() || '';
  const label = STEP_LABELS[stepName] || sector || 'Setor';

  const fetchSteps = async () => {
    try {
      const res = await api.get('/production/kanban');
      const filtered = res.data.filter((s: ProductionStep) => s.stepName === stepName);
      setSteps(filtered);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    const res = await api.get('/orders');
    // Filtrar apenas pedidos que não estão DEUVERED ou CANCELLED
    setOrders(res.data.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'));
  };

  useEffect(() => { 
    fetchSteps(); 
    const interval = setInterval(fetchSteps, 30000);
    return () => clearInterval(interval);
  }, [sector]);

  const handleUpdatePartial = async (id: string, completedQuantity: number) => {
    try {
      await api.put(`/production/steps/${id}`, { completedQuantity });
      toast.success('Progresso atualizado!');
      fetchSteps();
    } catch (err) {
      toast.error('Erro ao atualizar progresso');
    }
  };

  const handleOpenManual = () => {
    fetchOrders();
    setShowManual(true);
  };

  const handleInject = async () => {
    if (!manualForm.itemId) return toast.error('Selecione uma peça');
    try {
      await api.post('/production/inject', {
        orderItemId: manualForm.itemId,
        targetStepName: stepName,
        quantity: manualForm.quantity
      });
      toast.success('Peça adicionada ao setor!');
      setShowManual(false);
      fetchSteps();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar peça');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ borderBottom: `4px solid ${STEP_COLORS[stepName] || 'var(--color-primary)'}`, paddingBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5em' }}>{STEP_EMOJIS[stepName] || '🛠️'}</span>
            Setor de {label}
          </h1>
          <p className="page-subtitle">Pilha de trabalho atual e prioridades</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ gap: 8 }} onClick={handleOpenManual}>
               <PlusCircle size={18} /> Entrada Manual
            </button>
            <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{steps.length}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>PEÇAS NA FILA</span>
            </div>
            <button className="btn btn-secondary" onClick={fetchSteps}>
                <RefreshCw size={16} />
            </button>
        </div>
      </div>

      <div className="grid-3 gap-6" style={{ marginTop: 32 }}>
        {steps.length === 0 && !loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 100, opacity: 0.3 }}>
            <Package size={60} style={{ margin: '0 auto 20px' }} />
            <h3>Nenhuma peça aguardando {label}</h3>
          </div>
        )}

        {steps.map((step) => {
          const startedAt = step.startedAt ? new Date(step.startedAt) : null;
          const elapsedMin = startedAt ? (Date.now() - startedAt.getTime()) / 60000 : 0;
          const isDelayed = step.status === 'IN_PROGRESS' && elapsedMin > step.estimatedMinutes;
          const deliveryDate = step.item?.order?.deliveryDate ? new Date(step.item.order.deliveryDate) : null;
          const hasUrgency = step.item?.order?.alerts?.some((a: any) => a.type === 'DEADLINE_APPROACHING');
          const completionPercent = (step.completedQuantity / step.item.quantity) * 100;

          return (
            <div 
              key={step.id} 
              className={`card shadow-premium ${hasUrgency ? 'urgent' : ''} ${isDelayed ? 'delayed' : ''} ${step.item?.priorityRank === 1 ? 'priority-1' : ''}`} 
              style={{ 
                position: 'relative', 
                overflow: 'hidden',
                border: step.item?.priorityRank === 1 ? '2px solid var(--color-warning)' : undefined,
                boxShadow: step.item?.priorityRank === 1 ? '0 0 15px rgba(245, 158, 11, 0.2)' : undefined
              }}
            >

              <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: STEP_COLORS[stepName] || 'var(--color-primary)', width: `${completionPercent}%`, transition: 'width 0.5s ease' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: hasUrgency ? 'var(--color-danger)' : 'var(--color-primary)' }}>#{step.item?.order?.orderNumber}</span>
                        {step.item?.priorityRank && (
                          <span style={{ fontSize: 10, background: step.item.priorityRank === 1 ? 'var(--color-warning)' : 'var(--color-surface-3)', color: step.item.priorityRank === 1 ? 'black' : 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 900 }}>
                            {step.item.priorityRank}º NA FILA
                          </span>
                        )}
                        {hasUrgency && <span className="badge badge-danger" style={{ fontSize: 9 }}>URGENTE</span>}
                   </div>

                   <div style={{ fontSize: 14, fontWeight: 700 }}>{step.item?.productName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>TÉCNICO</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{step.assignedTo || '---'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                 <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 2 }}>PRODUZIDO</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>{step.completedQuantity} <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 400 }}>de {step.item.quantity}</span></div>
                 </div>
                 <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 2 }}>PROGRESSO</div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.round(completionPercent)}%</div>
                 </div>
              </div>

              <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 4 }}>CLIENTE</div>
                <div style={{ fontWeight: 600, color: step.item?.order?.client?.name ? 'inherit' : 'var(--color-warning)', fontSize: step.item?.order?.client?.name ? 14 : 11 }}>
                  {step.item?.order?.client?.name || (step.item?.isStock ? '📦 PRODUÇÃO LIVRE (ESTOQUE)' : '👤 VENDA AVULSA / SEM CLIENTE')}
                </div>
              </div>


              {step.notes && (
                <div style={{ fontSize: 12, color: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.05)', padding: 12, borderRadius: 10, marginBottom: 20 }}>
                    <strong>Obs:</strong> {step.notes}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                      type="number" 
                      className="input" 
                      min="0"
                      max={step.item.quantity}
                      placeholder="Qtd atual..."
                      defaultValue={step.completedQuantity}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val !== step.completedQuantity) handleUpdatePartial(step.id, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value);
                          if (!isNaN(val)) handleUpdatePartial(step.id, val);
                        }
                      }}
                      style={{ paddingLeft: 34 }}
                    />
                    <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
                 </div>
                 <button className="btn btn-success" onClick={() => handleUpdatePartial(step.id, step.item.quantity)} title="Finalizar tudo">
                    <CheckCircle2 size={18} />
                 </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)' }}>
                    <Clock size={14} />
                    <span>Entrega: {deliveryDate ? format(deliveryDate, "dd/MM", { locale: ptBR }) : '---'}</span>
                 </div>
                 <div style={{ fontSize: 11, color: isDelayed ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
                    Meta: {step.estimatedMinutes}m
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE ENTRADA MANUAL */}
      {showManual && (
        <div className="modal-overlay" onClick={() => setShowManual(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
             <div className="modal-header">
                <h2 className="modal-title">Entrada Manual - {label}</h2>
                <button className="btn btn-ghost" onClick={() => setShowManual(false)}><X size={20}/></button>
             </div>
             <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
                  Use esta opção para puxar uma peça de um pedido diretamente para este setor, pulando etapas anteriores.
                </p>
                
                <div className="form-group">
                  <label className="form-label">Selecione o Pedido</label>
                  <select className="form-input" onChange={(e) => {
                    const order = orders.find(o => o.id === e.target.value);
                    setSelectedOrder(order || null);
                    setManualForm({ ...manualForm, itemId: '' });
                  }}>
                    <option value="">Selecione um pedido...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>{o.orderNumber} - {o.client?.name}</option>
                    ))}
                  </select>
                </div>

                {selectedOrder && (
                  <div className="form-group">
                    <label className="form-label">Selecione a Peça</label>
                    <select className="form-input" value={manualForm.itemId} onChange={(e) => setManualForm({ ...manualForm, itemId: e.target.value })}>
                      <option value="">Selecione...</option>
                      {selectedOrder.items.map(item => (
                        <option key={item.id} value={item.id}>{item.quantity}x {item.productName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Quantidade a Produzir neste Setor</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1"
                    max={selectedOrder?.items.find(i => i.id === manualForm.itemId)?.quantity || 1}
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm({ ...manualForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
             </div>
             <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowManual(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ gap: 8 }} onClick={handleInject}>
                  <Play size={16} fill="white" /> Injetar no Setor
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
