import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Scissors, 
  Flame, 
  Sparkles, 
  Package, 
  Clock, 
  AlertTriangle,
  GripVertical,
  RefreshCw,
  Droplets,
  Hammer,
  Paintbrush,
  Snowflake
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { ProductionStep, StepName, StepStatus } from '../types';
import { STEP_LABELS, STEP_COLORS, STEP_EMOJIS, STEP_STATUS_LABELS } from '../types';
import api from '../services/api';

const COLUMN_ICONS: Record<string, React.ReactNode> = {
  CUTTING: <Scissors size={18} />,
  MOLDING: <Flame size={18} />,
  PAINTING: <Paintbrush size={18} />,
  FINISHING: <Hammer size={18} />,
  GLOSS: <Sparkles size={18} />,
  CLEANING: <Droplets size={18} />,
  PACKAGING: <Package size={18} />,
};

function KanbanCard({ step, onUpdate }: { step: ProductionStep; onUpdate: (id: string, status: StepStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startedAt = step.startedAt ? new Date(step.startedAt) : null;
  const elapsedMin = startedAt ? (Date.now() - startedAt.getTime()) / 60000 : 0;
  const isDelayed = step.status === 'IN_PROGRESS' && elapsedMin > step.estimatedMinutes;
  const deliveryDate = step.item?.order?.deliveryDate ? new Date(step.item.order.deliveryDate) : null;
  const hasUrgency = step.item?.order?.alerts?.some((a: any) => a.type === 'DEADLINE_APPROACHING');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${hasUrgency ? 'urgent' : ''} ${isDelayed ? 'delayed' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: hasUrgency ? 'var(--color-danger)' : 'var(--color-primary)' }}>
              {step.item?.order?.orderNumber}
            </span>
            {hasUrgency && <span style={{ fontSize: 8, background: 'var(--color-danger)', color: 'white', padding: '1px 4px', borderRadius: 4, fontWeight: 800 }}>URGENTE</span>}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-1)' }}>
            {step.item?.quantity}x {step.item?.productName}
          </span>
        </div>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-3)' }}>
          <GripVertical size={14} />
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 12 }}>
        {step.item?.order?.client?.name}
      </div>
      
      {deliveryDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isDelayed || hasUrgency ? 'var(--color-danger)' : 'var(--color-text-3)', marginBottom: 8 }}>
          <Clock size={12} />
          <span>Entrega: {format(deliveryDate, "dd/MM", { locale: ptBR })}</span>
          {(isDelayed || hasUrgency) && <AlertTriangle size={12} />}
        </div>
      )}

      {step.notes && (
        <div style={{ fontSize: 10, background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6, marginBottom: 12, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
          Obs: {step.notes}
        </div>
      )}

      <div className="card-footer" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {step.status === 'PENDING' ? (
            <button className="btn btn-primary btn-sm" onClick={() => onUpdate(step.id, 'IN_PROGRESS')} style={{ padding: '4px 10px', fontSize: 11 }}>
              🚀 Iniciar
            </button>
          ) : (
            <button className="btn btn-success btn-sm" onClick={() => onUpdate(step.id, 'COMPLETED')} style={{ padding: '4px 10px', fontSize: 11 }}>
              ✅ Próxima Etapa
            </button>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
           <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, display: 'block', color: isDelayed ? 'var(--color-danger)' : 'inherit' }}>
            {step.status === 'IN_PROGRESS' ? `${Math.round(elapsedMin)} min` : STEP_STATUS_LABELS[step.status]}
          </span>
          <span style={{ fontSize: 9, color: 'var(--color-text-3)' }}>
            Meta: {step.estimatedMinutes}m
          </span>
        </div>
      </div>
    </div>
  );
}


function KanbanColumn({ stepName, steps, onUpdateStep }: { 
  stepName: StepName; 
  steps: ProductionStep[]; 
  onUpdateStep: (id: string, status: StepStatus) => void;
}) {
  const label = STEP_LABELS[stepName] || stepName;
  const icon = (COLUMN_ICONS as any)[stepName] || <Package size={18} />;
  
  return (
    <div className="kanban-column" style={{ borderTop: `4px solid ${STEP_COLORS[stepName] || 'var(--color-border)'}` }}>
      <div className="column-header">
        <div className="column-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span>{label} {STEP_EMOJIS[stepName]}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99 }}>
          {steps.length}
        </span>
      </div>

      <div className="kanban-cards">
        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {steps.map((step) => (
            <KanbanCard key={step.id} step={step} onUpdate={onUpdateStep} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSteps = async () => {
    try {
      const res = await api.get('/production/kanban');
      setSteps(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchSteps(); 
    const interval = setInterval(fetchSteps, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, status: StepStatus) => {
    try {
      await api.put(`/production/steps/${id}`, { status });
      toast.success(status === 'IN_PROGRESS' ? 'Etapa iniciada!' : 'Etapa concluída!');
      fetchSteps();
    } catch (err) {
      toast.error('Erro ao atualizar etapa');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
  };

  const columns: StepName[] = ['CUTTING', 'MOLDING', 'PAINTING', 'FINISHING', 'GLOSS', 'CLEANING', 'PACKAGING'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Linha de Produção</h1>
          <p className="page-subtitle">Rastreamento de peças pelos setores da fábrica</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchSteps}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {loading && steps.length === 0 ? <p>Sincronizando fábrica...</p> : (
        <div className="kanban-board" style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 20 }}>
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            {columns.map(col => (
              <KanbanColumn 
                key={col} 
                stepName={col} 
                steps={steps.filter(s => s.stepName === col)} 
                onUpdateStep={handleUpdateStatus} 
              />
            ))}
          </DndContext>
        </div>
      )}
    </div>
  );
}
