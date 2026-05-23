import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Clock, 
  RefreshCw,
  Package,
  CheckCircle2,
  PlusCircle,
  X,
  Play,
  Search,
  Filter,
  AlertTriangle
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
  
  // Quantidades locais para controle parcial por card
  const [localQty, setLocalQty] = useState<Record<string, number>>({});

  // Estados de Busca e Filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgent, setFilterUrgent] = useState(false);

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
    setOrders(res.data.filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'));
  };

  useEffect(() => { 
    setSearchQuery('');
    setFilterUrgent(false);
    fetchSteps(); 
    const interval = setInterval(fetchSteps, 30000);
    return () => clearInterval(interval);
  }, [sector]);

  const handleQtyStepChange = (stepId: string, increment: number, max: number) => {
    const current = localQty[stepId] || 1;
    const next = Math.max(1, Math.min(max, current + increment));
    setLocalQty(prev => ({ ...prev, [stepId]: next }));
  };

  const toggleChecklist = async (stepId: string, itemId: string, isChecked: boolean) => {
    try {
      await api.put(`/production/steps/${stepId}/checklist/${itemId}`, { isChecked });
      fetchSteps();
    } catch (e) {
      toast.error('Erro ao atualizar checklist');
    }
  };

  const handleCompleteAll = async (step: ProductionStep) => {
    const maxQty = step.item.quantity;
    try {
      await api.put(`/production/steps/${step.id}`, { 
        completedQuantity: maxQty, 
        status: 'COMPLETED' 
      });
      toast.success('Etapa concluída com sucesso!');
      fetchSteps();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao concluir etapa');
    }
  };

  const handleCompletePartial = async (step: ProductionStep, qty: number) => {
    try {
      await api.put(`/production/steps/${step.id}`, { 
        completedQuantity: qty, 
        status: 'IN_PROGRESS' 
      });
      toast.success('Progresso parcial registrado!');
      fetchSteps();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao registrar progresso');
    }
  };

  const handleSplitAndAdvance = async (step: ProductionStep, qty: number) => {
    try {
      await api.post(`/production/steps/${step.id}/split`, { quantityToAdvance: qty });
      toast.success(`${qty} peças avançadas para a próxima etapa!`);
      setLocalQty(prev => ({ ...prev, [step.id]: 1 }));
      fetchSteps();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao avançar peças');
    }
  };

  const isMandatoryChecked = (step: ProductionStep) => {
    return !step.checklistItems || step.checklistItems.every(c => !c.isMandatory || c.isChecked);
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

  // Filtragem dos cards
  const filteredSteps = steps.filter(step => {
    const query = searchQuery.toLowerCase().trim();
    
    const orderNumber = step.item?.order?.orderNumber?.toLowerCase() || '';
    const clientName = step.item?.order?.client?.name?.toLowerCase() || '';
    const productName = step.item?.productName?.toLowerCase() || '';
    const notes = step.notes?.toLowerCase() || '';
    const assignee = step.assignedTo?.toLowerCase() || '';

    const matchesSearch = !query || 
      orderNumber.includes(query) ||
      clientName.includes(query) ||
      productName.includes(query) ||
      notes.includes(query) ||
      assignee.includes(query);

    if (filterUrgent) {
      const hasUrgency = step.item?.order?.alerts?.some((a: any) => a.type === 'DEADLINE_APPROACHING') || 
                         step.item?.priorityRank === 1 || 
                         step.item?.order?.isPriority;
      return matchesSearch && hasUrgency;
    }

    return matchesSearch;
  });

  return (
    <div className="fade-in">
      {/* Cabeçalho */}
      <div className="page-header" style={{ borderBottom: `4px solid ${STEP_COLORS[stepName] || 'var(--color-primary)'}`, paddingBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5em' }}>{STEP_EMOJIS[stepName] || '🛠️'}</span>
            Setor de {label}
          </h1>
          <p className="page-subtitle">Pilha de trabalho atual e prioridades</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" style={{ gap: 8, height: 44 }} onClick={handleOpenManual}>
               <PlusCircle size={18} /> Entrada Manual
            </button>
            <div className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', height: 44 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{steps.length}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 700 }}>PEÇAS NA FILA</span>
            </div>
            <button className="btn btn-secondary" style={{ height: 44, width: 44, padding: 0, justifyContent: 'center' }} onClick={fetchSteps}>
                <RefreshCw size={16} />
            </button>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros (Otimizada para tablet/chão de fábrica) */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginTop: 24, 
        marginBottom: 8, 
        flexWrap: 'wrap', 
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
        padding: '16px 20px',
        borderRadius: 12,
        border: '1px solid var(--color-border)'
      }}>
        {/* Input de Busca */}
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Buscar por pedido, cliente ou peça..." 
            className="form-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 42, paddingRight: 40, height: 46, borderRadius: 8, fontSize: 14 }}
          />
          <span style={{ position: 'absolute', left: 14, top: 13, opacity: 0.5, fontSize: 16 }}>🔍</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ 
                position: 'absolute', 
                right: 12, 
                top: 9, 
                background: 'rgba(255,255,255,0.05)', 
                border: 'none', 
                color: 'var(--color-text-2)', 
                cursor: 'pointer',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Toggles de Filtro Rápido */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={`btn ${!filterUrgent ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: 46, padding: '0 20px', borderRadius: 8, fontSize: 13, fontWeight: 800 }}
            onClick={() => setFilterUrgent(false)}
          >
            Todos os Itens ({steps.length})
          </button>
          <button 
            type="button"
            className={`btn ${filterUrgent ? 'btn-danger' : 'btn-secondary'}`}
            style={{ 
              height: 46, 
              padding: '0 20px', 
              borderRadius: 8, 
              fontSize: 13, 
              fontWeight: 800, 
              gap: 8,
              border: filterUrgent ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
              color: filterUrgent ? 'white' : 'var(--color-danger)'
            }}
            onClick={() => setFilterUrgent(!filterUrgent)}
          >
            <AlertTriangle size={16} /> Apenas Urgentes / Prioridades
          </button>
        </div>
      </div>

      {/* Grid de Cards da Fábrica */}
      <div className="grid-factory" style={{ marginTop: 20 }}>
        {filteredSteps.length === 0 && !loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', opacity: 0.4 }}>
            <Package size={64} style={{ margin: '0 auto 16px', color: 'var(--color-text-3)' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Nenhuma peça encontrada</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginTop: 4 }}>
              {searchQuery || filterUrgent ? 'Tente limpar a busca ou os filtros' : `Nenhum lote aguardando no Setor de ${label}`}
            </p>
          </div>
        )}

        {filteredSteps.map((step) => {
          const startedAt = step.startedAt ? new Date(step.startedAt) : null;
          const elapsedMin = startedAt ? (Date.now() - startedAt.getTime()) / 60000 : 0;
          const isDelayed = step.status === 'IN_PROGRESS' && elapsedMin > step.estimatedMinutes;
          const deliveryDate = step.item?.order?.deliveryDate ? new Date(step.item.order.deliveryDate) : null;
          const hasUrgency = step.item?.order?.alerts?.some((a: any) => a.type === 'DEADLINE_APPROACHING') || step.item?.order?.isPriority;
          const isFirstInQueue = step.item?.priorityRank === 1;
          const completionPercent = (step.completedQuantity / step.item.quantity) * 100;
          
          const checklistOk = isMandatoryChecked(step);
          const currentPartialQty = localQty[step.id] || 1;

          return (
            <div 
              key={step.id} 
              className={`card shadow-premium ${hasUrgency ? 'urgent' : ''} ${isDelayed ? 'delayed' : ''} ${isFirstInQueue ? 'priority-1' : ''}`} 
              style={{ 
                position: 'relative', 
                overflow: 'hidden',
                border: isFirstInQueue ? '2px solid var(--color-warning)' : hasUrgency ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                boxShadow: isFirstInQueue ? '0 0 15px rgba(245, 158, 11, 0.15)' : hasUrgency ? '0 0 15px rgba(239, 68, 68, 0.1)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                minHeight: 420
              }}
            >
              <div>
                {/* Linha indicadora de progresso no fundo */}
                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  height: 6, 
                  background: STEP_COLORS[stepName] || 'var(--color-primary)', 
                  width: `${completionPercent}%`, 
                  transition: 'width 0.4s ease' 
                }} />

                {/* Cabeçalho do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: hasUrgency ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                            #{step.item?.order?.orderNumber}
                          </span>
                          
                          {isFirstInQueue && (
                            <span style={{ fontSize: 10, background: 'var(--color-warning)', color: 'black', padding: '3px 8px', borderRadius: 4, fontWeight: 900 }}>
                              1º NA FILA
                            </span>
                          )}
                          
                          {hasUrgency && (
                            <span className="badge badge-danger" style={{ fontSize: 9, padding: '3px 6px', fontWeight: 800 }}>
                              URGENTE
                            </span>
                          )}
                     </div>

                     {/* Cliente em destaque */}
                     <div style={{ 
                       fontSize: 13, 
                       fontWeight: 700, 
                       color: 'var(--color-text-2)', 
                       background: 'rgba(255, 255, 255, 0.04)', 
                       padding: '4px 10px', 
                       borderRadius: 6,
                       display: 'inline-block',
                       marginBottom: 8,
                       border: '1px solid rgba(255,255,255,0.05)'
                     }}>
                       👤 Cliente: {step.item?.order?.client?.name || 'Cliente Geral'}
                     </div>

                     {/* Nome do Produto com Fonte de destaque */}
                     <div style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
                       {step.item?.productName}
                     </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 800, textTransform: 'uppercase' }}>TÉCNICO</div>
                      <div style={{ 
                        fontSize: 12, 
                        fontWeight: 800, 
                        background: step.assignedTo ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                        color: step.assignedTo ? '#60a5fa' : 'var(--color-text-3)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        marginTop: 4,
                        border: step.assignedTo ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--color-border)',
                        display: 'inline-block'
                      }}>
                        {step.assignedTo || 'Não Atribuído'}
                      </div>
                  </div>
                </div>

                {/* Bloco de Progresso Numérico e Visual */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                   <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 4, fontWeight: 700 }}>PRODUZIDO</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-success)' }}>
                        {step.completedQuantity} <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>de {step.item.quantity} un</span>
                      </div>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginBottom: 4, fontWeight: 700 }}>PROGRESSO</div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{Math.round(completionPercent)}%</div>
                   </div>
                </div>

                {/* Observações com destaque */}
                {step.notes && (
                  <div style={{ 
                    fontSize: 12, 
                    color: 'var(--color-warning)', 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    padding: '12px 14px', 
                    borderRadius: 8, 
                    marginBottom: 18,
                    borderLeft: '4px solid var(--color-warning)',
                    fontWeight: 600
                  }}>
                      <strong>Obs:</strong> {step.notes}
                  </div>
                )}

                {/* Checklist Grande de Fácil Toque */}
                {step.checklistItems && step.checklistItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📋 CHECKLIST OBRIGATÓRIA:
                    </div>
                    
                    {step.checklistItems.map(ci => {
                      const isMandatoryUnchecked = ci.isMandatory && !ci.isChecked;
                      
                      const cardBorder = ci.isChecked 
                        ? '1px solid rgba(34, 197, 94, 0.4)' 
                        : isMandatoryUnchecked 
                          ? '1px solid rgba(239, 68, 68, 0.4)' 
                          : '1px solid var(--color-border)';

                      const cardBg = ci.isChecked 
                        ? 'rgba(34, 197, 94, 0.06)' 
                        : isMandatoryUnchecked 
                          ? 'rgba(239, 68, 68, 0.02)' 
                          : 'rgba(255, 255, 255, 0.01)';

                      return (
                        <div 
                          key={ci.id} 
                          onClick={() => toggleChecklist(step.id, ci.id, !ci.isChecked)} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 14, 
                            cursor: 'pointer', 
                            background: cardBg, 
                            padding: '12px 16px', 
                            borderRadius: 8, 
                            border: cardBorder,
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          {/* Caixa de seleção gigante */}
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            border: ci.isChecked ? 'none' : '2px solid var(--color-text-3)',
                            background: ci.isChecked ? 'var(--color-success)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: 14,
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}>
                            {ci.isChecked && '✓'}
                          </div>
                          
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ 
                              textDecoration: ci.isChecked ? 'line-through' : 'none', 
                              color: ci.isChecked ? 'var(--color-text-3)' : 'var(--color-text-1)',
                              fontSize: 13,
                              fontWeight: isMandatoryUnchecked ? 700 : 500
                            }}>
                              {ci.text}
                            </span>
                            {ci.isMandatory && !ci.isChecked && (
                              <span style={{ 
                                fontSize: 9, 
                                color: 'white', 
                                background: 'var(--color-danger)', 
                                padding: '2px 8px', 
                                borderRadius: 4, 
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Obrigatório
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ações na base do Card */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  
                  {/* Botão Concluir Tudo */}
                  <button 
                    type="button"
                    className={checklistOk ? 'btn btn-success' : 'btn btn-secondary'} 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      fontWeight: 850, 
                      padding: '14px 20px',
                      fontSize: 15,
                      borderRadius: 8,
                      opacity: checklistOk ? 1 : 0.45,
                      cursor: checklistOk ? 'pointer' : 'not-allowed',
                      gap: 8,
                      boxShadow: checklistOk ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                    }}
                    onClick={() => checklistOk && handleCompleteAll(step)}
                    disabled={!checklistOk}
                  >
                     <CheckCircle2 size={18} /> CONCLUIR TUDO ({step.item.quantity} un)
                  </button>

                  {/* Alerta caso checklist esteja pendente */}
                  {!checklistOk && (
                    <div style={{ 
                      fontSize: 11, 
                      color: 'var(--color-danger)', 
                      background: 'rgba(239, 68, 68, 0.06)', 
                      padding: '8px 12px', 
                      borderRadius: 6, 
                      textAlign: 'center',
                      fontWeight: 700,
                      border: '1px solid rgba(239, 68, 68, 0.1)'
                    }}>
                      ⚠️ Marque os itens obrigatórios da checklist para liberar.
                    </div>
                  )}

                  {/* Produção Parcial / Avanço (Apenas se quantidade > 1) */}
                  {step.item.quantity > 1 && (
                    <div style={{ 
                      border: '1px dashed var(--color-border)', 
                      borderRadius: 10, 
                      padding: '14px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 12,
                      background: 'rgba(255,255,255,0.01)',
                      marginTop: 6
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 800 }}>PRODUÇÃO PARCIAL:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%', 
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20, 
                              fontWeight: 800 
                            }}
                            onClick={() => handleQtyStepChange(step.id, -1, step.item.quantity - 1)}
                            disabled={currentPartialQty <= 1}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 900, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{currentPartialQty}</span>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%', 
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20, 
                              fontWeight: 800 
                            }}
                            onClick={() => handleQtyStepChange(step.id, 1, step.item.quantity - 1)}
                            disabled={currentPartialQty >= step.item.quantity - 1}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ 
                            fontSize: 11, 
                            justifyContent: 'center', 
                            padding: '10px 6px',
                            flexDirection: 'column',
                            gap: 2,
                            height: 'auto',
                            lineHeight: 1.2
                          }}
                          onClick={() => handleCompletePartial(step, currentPartialQty)}
                          disabled={!checklistOk}
                        >
                          <span style={{ fontWeight: 800 }}>Salvar Progresso</span>
                          <span style={{ fontSize: 9, opacity: 0.6 }}>Fazer {currentPartialQty} un</span>
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ 
                            fontSize: 11, 
                            justifyContent: 'center', 
                            padding: '10px 6px',
                            flexDirection: 'column',
                            gap: 2,
                            height: 'auto',
                            lineHeight: 1.2
                          }}
                          onClick={() => handleSplitAndAdvance(step, currentPartialQty)}
                          disabled={!checklistOk}
                        >
                          <span style={{ fontWeight: 800 }}>Avançar Peças</span>
                          <span style={{ fontSize: 9, opacity: 0.8 }}>Mandar {currentPartialQty} un</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rodapé do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: 12 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>
                      <Clock size={12} />
                      <span>Entrega: {deliveryDate ? format(deliveryDate, "dd/MM", { locale: ptBR }) : '---'}</span>
                   </div>
                   <div style={{ fontSize: 10, fontWeight: 700, color: isDelayed ? 'var(--color-danger)' : 'var(--color-text-3)' }}>
                      Meta: {step.estimatedMinutes} min
                   </div>
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
                      <option key={o.id} value={o.id}>Pedido {o.orderNumber}</option>
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
