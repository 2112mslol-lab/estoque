import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Package,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { ProductionStep, StepName, StepStatus } from '../types';
import { STEP_LABELS, STEP_COLORS, STEP_EMOJIS } from '../types';
import api from '../services/api';

export default function ProductionSectorPage() {
  const { sector } = useParams<{ sector: string }>();
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);

  const stepName = sector?.toUpperCase() as StepName;
  const label = STEP_LABELS[stepName];

  if (!label) return <Navigate to="/kanban" replace />;

  const fetchSteps = async () => {
    try {
      const res = await api.get('/production/kanban');
      // Filtramos apenas as etapas DESTE setor
      const filtered = res.data.filter((s: ProductionStep) => s.stepName === stepName);
      setSteps(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchSteps(); 
    const interval = setInterval(fetchSteps, 30000);
    return () => clearInterval(interval);
  }, [sector]);

  const handleUpdateStatus = async (id: string, status: StepStatus) => {
    try {
      await api.put(`/production/steps/${id}`, { status });
      toast.success(status === 'IN_PROGRESS' ? 'Peça iniciada!' : 'Peça enviada para o próximo setor!');
      fetchSteps();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ borderBottom: `4px solid ${STEP_COLORS[stepName]}`, paddingBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5em' }}>{STEP_EMOJIS[stepName]}</span>
            Setor de {label}
          </h1>
          <p className="page-subtitle">Pilha de trabalho atual e prioridades</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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

          return (
            <div 
              key={step.id} 
              className={`card shadow-premium ${hasUrgency ? 'urgent' : ''} ${isDelayed ? 'delayed' : ''}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: hasUrgency ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                            {step.item?.order?.orderNumber}
                        </span>
                        {hasUrgency && <span className="badge badge-danger" style={{ fontSize: 9 }}>URGENTE</span>}
                   </div>
                   <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-1)' }}>
                        {step.item?.quantity}x {step.item?.productName}
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>TÉCNICO</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{step.assignedTo || '---'}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 4 }}>CLIENTE</div>
                <div style={{ fontWeight: 600 }}>{step.item?.order?.client?.name}</div>
              </div>

              {step.notes && (
                <div style={{ fontSize: 12, color: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.05)', padding: 12, borderRadius: 10, marginBottom: 20, borderLeft: '3px solid var(--color-warning)' }}>
                    <strong>Obs:</strong> {step.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isDelayed || hasUrgency ? 'var(--color-danger)' : 'var(--color-text-2)', marginBottom: 16 }}>
                        <Clock size={14} />
                        <span>Entrega: {deliveryDate ? format(deliveryDate, "dd/MM 'às' HH:mm", { locale: ptBR }) : '---'}</span>
                    </div>

                    {step.status === 'PENDING' ? (
                        <button className="btn btn-primary" onClick={() => handleUpdateStatus(step.id, 'IN_PROGRESS')} style={{ padding: '12px 24px' }}>
                            <PlayCircle size={18} /> Iniciar Trabalho
                        </button>
                    ) : (
                        <button className="btn btn-success" onClick={() => handleUpdateStatus(step.id, 'COMPLETED')} style={{ padding: '12px 24px' }}>
                            <CheckCircle2 size={18} /> Concluir e Passar
                        </button>
                    )}
                </div>

                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 4 }}>TEMPO</div>
                   <div style={{ 
                        fontSize: 20, 
                        fontWeight: 800, 
                        color: isDelayed ? 'var(--color-danger)' : 'var(--color-text-1)' 
                   }}>
                        {step.status === 'IN_PROGRESS' ? `${Math.round(elapsedMin)}m` : '0m'}
                   </div>
                   <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>Meta: {step.estimatedMinutes}m</div>
                </div>
              </div>

              {step.status === 'IN_PROGRESS' && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: isDelayed ? 'var(--color-danger)' : 'var(--color-primary)', width: `${Math.min((elapsedMin / step.estimatedMinutes) * 100, 100)}%`, transition: 'width 1s ease' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
