import { useEffect, useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Scissors, 
  Flame, 
  Snowflake, 
  Sparkles, 
  Package, 
  Clock, 
  AlertTriangle,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { ProductionStep, StepName, StepStatus } from '../types';
import { STEP_LABELS, STEP_COLORS, STEP_EMOJIS } from '../types';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

const STEP_ORDER: StepName[] = ['CUTTING', 'MOLDING', 'COOLING', 'FINISHING', 'PACKAGING'];

const COLUMN_ICONS: Record<string, React.ReactNode> = {
  CUTTING: <Scissors size={18} />,
  MOLDING: <Flame size={18} />,
  COOLING: <Snowflake size={18} />,
  FINISHING: <Sparkles size={18} />,
  PACKAGING: <Package size={18} />,
};

const STATUS_LABELS: Record<StepStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  COMPLETED: 'Concluído',
  BLOCKED: 'Bloqueado',
};

function KanbanCard({ step }: { step: ProductionStep }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const elapsedMin = step.startedAt
    ? (step.completedAt
      ? (new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 60000
      : (Date.now() - new Date(step.startedAt).getTime()) / 60000)
    : 0;

  const isDelayed = step.status === 'IN_PROGRESS' && elapsedMin > step.estimatedMinutes;
  const delayMin = isDelayed ? Math.round(elapsedMin - step.estimatedMinutes) : 0;
  const deliveryDate = step.order?.deliveryDate ? new Date(step.order.deliveryDate) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary-400)' }}>
          {step.order?.orderNumber}
        </span>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-3)' }}>
          <GripVertical size={14} />
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', marginBottom: 4 }}>
        {step.order?.product}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 12 }}>
        {step.order?.client.name}
      </div>
      
      {deliveryDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)', marginBottom: 8 }}>
          <Clock size={12} />
          <span>Previsão: {format(deliveryDate, "dd/MM", { locale: ptBR })}</span>
        </div>
      )}

      <div className="kanban-card-footer">
        {isDelayed ? (
          <div className="kanban-card-delay over">
            <AlertTriangle size={11} />
            {delayMin}min atrasado
          </div>
        ) : step.startedAt ? (
          <div className="kanban-card-delay ok">
            <Clock size={11} />
            {Math.round(elapsedMin)}min / {step.estimatedMinutes}min
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
            Est: {step.estimatedMinutes}min
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ stepName, steps, onUpdateStep }: {
  stepName: StepName;
  steps: ProductionStep[];
  onUpdateStep: (stepId: string, status: StepStatus) => void;
}) {
  const label = STEP_LABELS[stepName];

  const delayedCount = steps.filter(s => {
    if (s.status !== 'IN_PROGRESS' || !s.startedAt) return false;
    const elapsed = (Date.now() - new Date(s.startedAt).getTime()) / 60000;
    return elapsed > s.estimatedMinutes;
  }).length;

  return (
    <div className="kanban-column" style={{ borderTop: `4px solid ${STEP_COLORS[stepName] || 'var(--color-border)'}` }}>
      <div className="column-header">
        <div className="column-title">
          {COLUMN_ICONS[stepName]}
          <span>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 99 }}>
          {steps.length}
        </span>
      </div>

      <div className="kanban-cards">
        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {steps.length === 0 ? (
            <div style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--color-text-3)',
              fontSize: 12,
            }}>
              Nenhum item nesta etapa
            </div>
          ) : (
            steps.map(step => (
              <KanbanCard key={step.id} step={step} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const [kanban, setKanban] = useState<Record<StepName, ProductionStep[]>>({
    CUTTING: [],
    MOLDING: [],
    COOLING: [],
    FINISHING: [],
    PACKAGING: [],
  });
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchKanban = useCallback(async () => {
    const res = await api.get<Record<StepName, ProductionStep[]>>('/production/kanban');
    setKanban(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchKanban(); }, [fetchKanban]);

  useEffect(() => {
    const u1 = subscribe('step:updated', fetchKanban);
    const u2 = subscribe('order:created', fetchKanban);
    return () => { u1(); u2(); };
  }, [subscribe, fetchKanban]);

  const updateStep = async (stepId: string, status: StepStatus) => {
    try {
      await api.put(`/production/steps/${stepId}`, { status });
      toast.success(`Etapa ${STATUS_LABELS[status].toLowerCase()}!`);
      fetchKanban();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Encontra o card arrastado
    let draggedStep: ProductionStep | undefined;
    let fromColumn: StepName | undefined;
    let toColumn: StepName | undefined;

    for (const stepName of STEP_ORDER) {
      const col = kanban[stepName];
      const found = col.find(s => s.id === active.id);
      if (found) {
        draggedStep = found;
        fromColumn = stepName;
      }
      if (col.find(s => s.id === over.id)) {
        toColumn = stepName;
      }
    }

    // Se arrastou para outra coluna, verifica se faz sentido
    if (draggedStep && fromColumn && toColumn && fromColumn !== toColumn) {
      const toIndex = STEP_ORDER.indexOf(toColumn);
      const fromIndex = STEP_ORDER.indexOf(fromColumn);
      
      if (toIndex === fromIndex + 1) {
        // Mover para a próxima etapa = completar atual e iniciar próxima
        toast('Use o botão de ação para avançar etapas', { icon: 'ℹ️' });
      }
    }
  };

  const totalActive = STEP_ORDER.reduce((acc, step) => acc + kanban[step].length, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Linha de Produção</h1>
          <p className="page-subtitle">{totalActive} itens em produção</p>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchKanban()}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* Legenda */}
      <div className="card mb-4">
        <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
          {STEP_ORDER.map(stepName => {
            const count = kanban[stepName].length;
            const delayedHere = kanban[stepName].filter(s => {
              if (s.status !== 'IN_PROGRESS' || !s.startedAt) return false;
              const elapsed = (Date.now() - new Date(s.startedAt).getTime()) / 60000;
              return elapsed > s.estimatedMinutes;
            }).length;

            return (
              <div key={stepName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, background: STEP_COLORS[stepName], borderRadius: 2 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {STEP_EMOJIS[stepName]} {STEP_LABELS[stepName]}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>({count})</span>
                {delayedHere > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 700 }}>⚠️{delayedHere}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-3)' }}>
          Carregando Kanban...
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {STEP_ORDER.map(stepName => (
              <KanbanColumn
                key={stepName}
                stepName={stepName}
                steps={kanban[stepName]}
                onUpdateStep={updateStep}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Ações rápidas */}
      <div className="card mt-4">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚡ Ações Rápidas</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 8 }}>
          Para atualizar o status de uma etapa, acesse os detalhes do pedido na tela de <strong>Pedidos</strong> e clique em "Iniciar" ou "Concluir" em cada etapa.
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
          As colunas mostram os itens aguardando cada etapa. Cards com ⚠️ indicam atrasos.
        </p>
      </div>
    </div>
  );
}
