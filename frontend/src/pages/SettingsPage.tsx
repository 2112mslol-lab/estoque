import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Clock, 
  Palette,
  Power
} from 'lucide-react';
import { STEP_LABELS } from '../types';

interface ChecklistItemTemplate {
  id: string;
  text: string;
  isMandatory: boolean;
}

interface Template {
  id: string;
  name: string;
  stepOrder: number;
  estimatedMinutes: number;
  color: string;
  isActive: boolean;
  checklistItems?: ChecklistItemTemplate[];
}

function ChecklistManager({ template, onRefresh }: { template: Template, onRefresh: () => void }) {
  const [newItemText, setNewItemText] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);

  const handleAdd = async () => {
    if (!newItemText) return;
    try {
      await api.post(`/configs/templates/${template.id}/checklists`, { text: newItemText, isMandatory });
      setNewItemText('');
      onRefresh();
    } catch (e) {
      toast.error('Erro ao adicionar item');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await api.delete(`/configs/templates/checklists/${itemId}`);
      onRefresh();
    } catch (e) {
      toast.error('Erro ao remover item');
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
      <h4 style={{ fontSize: 13, marginBottom: 12, color: 'var(--color-text-2)' }}>Itens de Checklist Padrão</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {template.checklistItems?.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 6 }}>
            <div style={{ fontSize: 12 }}>
              {item.text} {item.isMandatory ? <span style={{ color: 'var(--color-danger)', marginLeft: 4 }}>* (Obrigatório)</span> : <span style={{ color: 'var(--color-text-3)', marginLeft: 4 }}>(Opcional)</span>}
            </div>
            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Novo item de checklist..." 
            value={newItemText} 
            onChange={e => setNewItemText(e.target.value)}
            style={{ flex: 1, padding: '6px 12px', fontSize: 12, height: 32 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={isMandatory} onChange={e => setIsMandatory(e.target.checked)} />
            Obrigatório
          </label>
          <button className="btn btn-primary" style={{ height: 32, padding: '0 12px', fontSize: 12 }} onClick={handleAdd}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStep, setNewStep] = useState({ name: '', estimatedMinutes: 60, color: '#3b82f6' });

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/configs/templates');
      setTemplates(res.data);
    } catch (err) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleUpdate = async (id: string, data: Partial<Template>) => {
    try {
      await api.put(`/configs/templates/${id}`, data);
      toast.success('Etapa atualizada');
      fetchTemplates();
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza? Isso pode afetar pedidos em andamento.')) return;
    try {
      await api.delete(`/configs/templates/${id}`);
      toast.success('Etapa removida');
      fetchTemplates();
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  const handleAdd = async () => {
    if (!newStep.name) return toast.error('Nome é obrigatório');
    try {
      const nextOrder = templates.length > 0 ? Math.max(...templates.map(t => t.stepOrder)) + 1 : 1;
      await api.post('/configs/templates', { ...newStep, stepOrder: nextOrder });
      toast.success('Nova etapa criada');
      setIsAdding(false);
      setNewStep({ name: '', estimatedMinutes: 60, color: '#3b82f6' });
      fetchTemplates();
    } catch (err) {
      toast.error('Erro ao criar etapa');
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '50vh' }}><div className="loading-spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SettingsIcon size={24} color="var(--color-primary)" />
            Configurações do Sistema
          </h1>
          <p className="page-subtitle">Personalize o fluxo de produção e etapas da fábrica</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={18} /> Nova Etapa
        </button>
      </div>

      <div className="grid-1 gap-6" style={{ marginTop: 32, maxWidth: 800 }}>
        
        {isAdding && (
          <div className="card shadow-premium" style={{ border: '2px dashed var(--color-primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
             <h3 style={{ marginBottom: 20 }}>Nova Etapa de Produção</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>NOME DA ETAPA</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ex: Qualidade" 
                    value={newStep.name}
                    onChange={e => setNewStep({...newStep, name: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>TEMPO ESTIMADO (MIN)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={newStep.estimatedMinutes}
                    onChange={e => setNewStep({...newStep, estimatedMinutes: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>COR IDENTIFICADORA</label>
                  <input 
                    type="color" 
                    className="input" 
                    style={{ height: 42, padding: 4 }}
                    value={newStep.color}
                    onChange={e => setNewStep({...newStep, color: e.target.value})}
                  />
                </div>
             </div>
             <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAdd}>Salvar Etapa</button>
             </div>
          </div>
        )}

        <div className="card">
          <div style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
             <GripVertical size={18} color="var(--color-text-3)" />
             <h3 style={{ fontSize: 16 }}>Fluxo de Trabalho Atual</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {templates.map((template) => (
              <div key={template.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="card" style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  display: 'grid', 
                  gridTemplateColumns: '40px 1fr 120px 120px 120px', 
                  alignItems: 'center', 
                  gap: 20,
                  opacity: template.isActive ? 1 : 0.5
                }}>
                  <div style={{ color: 'var(--color-text-3)' }}>#{template.stepOrder}</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: template.color || '#333' }}></div>
                    <span style={{ fontWeight: 600 }}>{STEP_LABELS[template.name] || template.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                     <Clock size={14} />
                     {template.estimatedMinutes} min
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className={`btn btn-icon ${template.isActive ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => handleUpdate(template.id, { isActive: !template.isActive })}
                      title={template.isActive ? 'Desativar' : 'Ativar'}
                    >
                      <Power size={16} />
                    </button>
                    <button 
                      className="btn btn-icon btn-ghost" 
                      onClick={() => {
                          const newName = window.prompt('Novo nome:', template.name);
                          if (newName) handleUpdate(template.id, { name: newName });
                      }}
                    >
                      <Save size={16} />
                    </button>
                    <button className="btn btn-icon btn-danger" onClick={() => handleDelete(template.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <Palette size={14} color="var(--color-text-3)" />
                     <input 
                      type="color" 
                      value={template.color || '#333'} 
                      onChange={e => handleUpdate(template.id, { color: e.target.value })}
                      style={{ width: 30, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                     />
                  </div>
                </div>
                
                <div style={{ paddingLeft: 60 }}>
                   <ChecklistManager template={template} onRefresh={fetchTemplates} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="alert alert-info" style={{ marginTop: 20 }}>
           💡 <strong>Dica:</strong> A ordem das etapas define como os itens fluirão no Kanban. Etapas desativadas não serão criadas em novos pedidos.
        </div>

      </div>
    </div>
  );
}
