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
  Trash2,
  X,
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
import { parseBorderType } from '../types/parseBorder';
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

function KanbanCard({ step, onUpdate, onClick, onDelete, onDefect }: { 
  step: ProductionStep; 
  onUpdate: (id: string, status: StepStatus) => void; 
  onClick: () => void;
  onDelete: (step: ProductionStep) => void;
  onDefect: (step: ProductionStep) => void;
}) {
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
  
  // Cálculo de Inteligência: Facilidade de Finalização
  const completionPercent = step.item?.productionSteps 
    ? (step.item.productionSteps.filter((s: any) => s.status === 'COMPLETED').length / step.item.productionSteps.length) * 100 
    : 0;
  
  const isQuickWin = completionPercent >= 75;

  const { border: borderType } = parseBorderType(step.item?.customization);

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card ${hasUrgency ? 'urgent' : ''} ${isDelayed ? 'delayed' : ''} ${isQuickWin ? 'quick-win' : ''}`}
      onClick={onClick}
      style={{
        ...style,
        borderTop: isQuickWin ? '4px solid #10b981' : undefined,
        boxShadow: isQuickWin ? '0 0 15px rgba(16, 185, 129, 0.2)' : (step.item?.priorityRank === 1 ? '0 0 12px var(--color-warning)' : undefined),
        border: step.item?.priorityRank === 1 ? '2px solid var(--color-warning)' : undefined
      } as any}

    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: hasUrgency ? 'var(--color-danger)' : 'var(--color-primary)' }}>
              {step.item?.order?.orderNumber}
            </span>
            {step.item?.priorityRank && (
              <span style={{ fontSize: 10, background: step.item.priorityRank === 1 ? 'var(--color-warning)' : 'var(--color-surface-3)', color: step.item.priorityRank === 1 ? 'black' : 'white', padding: '2px 8px', borderRadius: 4, fontWeight: 900, border: '1px solid rgba(255,255,255,0.1)' }}>
                {step.item.priorityRank}º FILA
              </span>
            )}
            {hasUrgency && <span style={{ fontSize: 8, background: 'var(--color-danger)', color: 'white', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>URGENTE</span>}
            {isQuickWin && <span style={{ fontSize: 8, background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>QUASE PRONTO</span>}

          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-1)' }}>
            {step.item?.quantity}x {step.item?.productName}
          </span>
        </div>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-text-3)' }}>
          <GripVertical size={14} />
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{step.item?.isStock ? '📦 Produção de Estoque' : '👤 Produção sob Demanda'}</span>
        {borderType && (
          <span style={{ 
            background: borderType === 'COM_BORDA' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
            color: borderType === 'COM_BORDA' ? 'var(--color-warning)' : 'var(--color-text-3)',
            border: borderType === 'COM_BORDA' ? '1px solid var(--color-warning)' : '1px solid rgba(255,255,255,0.1)',
            padding: '2px 6px', borderRadius: 4, fontSize: 10 
          }}>
            {borderType === 'COM_BORDA' ? '🔲 COM BORDA' : '⬜ SEM BORDA'}
          </span>
        )}
      </div>


      {/* Barra de Progresso do Item */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
         <div style={{ height: '100%', background: isQuickWin ? '#10b981' : 'var(--color-primary)', width: `${completionPercent}%`, transition: 'width 0.5s ease' }}></div>
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

      {step.checklistItems && step.checklistItems.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>☑</span> {step.checklistItems.filter(c => c.isChecked).length} / {step.checklistItems.length}
        </div>
      )}

      <div className="card-footer" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>
             {step.completedQuantity} / {step.item?.quantity} un
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button 
            className="btn btn-ghost" 
            style={{ padding: 4, color: 'var(--color-warning)' }} 
            onClick={(e) => { e.stopPropagation(); onDefect(step); }}
            title="Relatar Defeito"
          >
            <AlertTriangle size={14} />
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ padding: 4, color: 'var(--color-danger)' }} 
            onClick={(e) => { e.stopPropagation(); onDelete(step); }}
            title="Excluir Peça"
          >
            <Trash2 size={14} />
          </button>
          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, display: 'block', color: isDelayed ? 'var(--color-danger)' : 'inherit' }}>
            {step.status === 'IN_PROGRESS' ? `${Math.round(elapsedMin)} min` : 'Aguardando'}
          </span>
        </div>
      </div>
    </div>

  );
}


function KanbanColumn({ stepName, steps, onUpdateStep, onCardClick, onDeleteClick, onDefectClick }: { 
  stepName: StepName; 
  steps: ProductionStep[]; 
  onUpdateStep: (id: string, status: StepStatus) => void;
  onCardClick: (step: ProductionStep) => void;
  onDeleteClick: (step: ProductionStep) => void;
  onDefectClick: (step: ProductionStep) => void;
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
            <KanbanCard 
              key={step.id} 
              step={step} 
              onUpdate={onUpdateStep} 
              onClick={() => onCardClick(step)} 
              onDelete={onDeleteClick}
              onDefect={onDefectClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function StepDetailsModal({ step, onClose, onRefresh }: { step: ProductionStep; onClose: () => void; onRefresh: () => void }) {
  const [updating, setUpdating] = useState(false);

  const toggleChecklist = async (itemId: string, isChecked: boolean) => {
    try {
      await api.put(`/production/steps/${step.id}/checklist/${itemId}`, { isChecked });
      onRefresh();
    } catch (e) {
      toast.error('Erro ao atualizar checklist');
    }
  };

  const maxQty = step.item?.quantity || 1;
  const [completedQty, setCompletedQty] = useState<number>(maxQty);

  const handleComplete = async () => {
    try {
      setUpdating(true);
      await api.put(`/production/steps/${step.id}`, { 
        completedQuantity: completedQty, 
        status: completedQty >= maxQty ? 'COMPLETED' : 'IN_PROGRESS' 
      });
      toast.success(completedQty >= maxQty ? 'Etapa concluída!' : 'Quantidade atualizada no setor!');
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar etapa');
    } finally {
      setUpdating(false);
    }
  };

  const handleSplitAndAdvance = async () => {
    try {
      setUpdating(true);
      await api.post(`/production/steps/${step.id}/split`, { quantityToAdvance: completedQty });
      toast.success(`${completedQty} peças avançadas para a próxima etapa!`);
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao desmembrar item');
    } finally {
      setUpdating(false);
    }
  };

  const allMandatoryChecked = !step.checklistItems || step.checklistItems.every(c => !c.isMandatory || c.isChecked);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card shadow-premium" onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface-2)', padding: 24, borderRadius: 12, width: 450, maxWidth: '90%' }}>
        <h3 style={{ marginBottom: 16 }}>Detalhes da Etapa</h3>
        <p><strong>Pedido:</strong> {step.item?.order?.orderNumber}</p>
        <p><strong>Produto:</strong> {step.item?.quantity}x {step.item?.productName}</p>
        
        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--color-text-2)' }}>Quantidade que está pronta agora:</label>
          <input 
            type="number" 
            className="input" 
            value={completedQty} 
            onChange={(e) => setCompletedQty(parseInt(e.target.value) || 0)}
            min={1}
            max={maxQty}
            style={{ width: '100%', padding: '8px 12px' }}
          />
        </div>

        {step.checklistItems && step.checklistItems.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4>Checklist</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {step.checklistItems.map(ci => (
                <label key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 }}>
                  <input type="checkbox" checked={ci.isChecked} onChange={(e) => toggleChecklist(ci.id, e.target.checked)} />
                  <span style={{ textDecoration: ci.isChecked ? 'line-through' : 'none', color: ci.isChecked ? 'var(--color-text-3)' : 'inherit' }}>
                    {ci.text} {ci.isMandatory ? <span style={{ color: 'var(--color-danger)' }}>*</span> : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {completedQty < maxQty && completedQty > 0 ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 8, padding: 8, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
                💡 Você selecionou uma quantidade parcial. Você deseja <strong>desmembrar</strong> essas peças para a próxima etapa, ou apenas <strong>registrar</strong> o progresso e mantê-las aqui?
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                <button className="btn btn-secondary" onClick={handleComplete} disabled={updating || !allMandatoryChecked}>
                  Apenas Registrar ({completedQty} un)
                </button>
                <button className="btn btn-primary" onClick={handleSplitAndAdvance} disabled={updating || !allMandatoryChecked}>
                  Avançar Peças Prontas
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={updating || !allMandatoryChecked || completedQty <= 0}>
                {updating ? 'Aguarde...' : 'Concluir Etapa'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<ProductionStep | null>(null);

  const [itemToDelete, setItemToDelete] = useState<ProductionStep | null>(null);
  const [itemToDefect, setItemToDefect] = useState<ProductionStep | null>(null);
  const [defectReason, setDefectReason] = useState('');

  const fetchSteps = async () => {
    try {
      const [stepsRes, templatesRes] = await Promise.all([
        api.get('/production/kanban'),
        api.get('/configs/templates')
      ]);
      setSteps(stepsRes.data);
      setTemplates(templatesRes.data.filter((t: any) => t.isActive));
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

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/production/items/${itemToDelete.orderItemId}`);
      toast.success('Item excluído com sucesso');
      setItemToDelete(null);
      fetchSteps();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao excluir item');
    }
  };

  const handleReportDefect = async () => {
    if (!itemToDefect || !defectReason.trim()) return toast.error('Informe o motivo do defeito');
    try {
      await api.post(`/production/steps/${itemToDefect.id}/defect`, { reason: defectReason });
      toast.success('Defeito registrado. Peça retornou para a fila inicial.');
      setItemToDefect(null);
      setDefectReason('');
      fetchSteps();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao registrar defeito');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
  };

  const columns = templates.map(t => t.name);


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
                onCardClick={(s) => setSelectedStep(s)} 
                onDeleteClick={(s) => setItemToDelete(s)}
                onDefectClick={(s) => setItemToDefect(s)}
              />
            ))}
          </DndContext>
        </div>
      )}
      {selectedStep && (
        <StepDetailsModal 
          step={selectedStep} 
          onClose={() => setSelectedStep(null)} 
          onRefresh={() => { fetchSteps(); setSelectedStep(prev => steps.find(s => s.id === prev?.id) || null); }}
        />
      )}

      {/* MODAL DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="modal-overlay" onClick={() => setItemToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>Excluir Peça</h2>
              <button className="btn btn-ghost" onClick={() => setItemToDelete(null)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 20 }}>
                Tem certeza que deseja excluir esta peça da produção? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setItemToDelete(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleDeleteItem}>Sim, Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DEFEITO */}
      {itemToDefect && (
        <div className="modal-overlay" onClick={() => setItemToDefect(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--color-warning)' }}>Relatar Defeito</h2>
              <button className="btn btn-ghost" onClick={() => setItemToDefect(null)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 16 }}>
                Esta peça será marcada com defeito e retornará para a primeira etapa da produção.
              </p>
              <div className="form-group">
                <label className="form-label">Qual o motivo do defeito?</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Ex: Peça arranhada, quebrou na borda, etc."
                  value={defectReason}
                  onChange={e => setDefectReason(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setItemToDefect(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{ background: 'var(--color-warning)', color: 'black' }} onClick={handleReportDefect}>Confirmar Retorno</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
