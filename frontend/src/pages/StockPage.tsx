import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Package, TrendingDown, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Material, UnitType, MovementType } from '../types';
import { UNIT_LABELS } from '../types';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

function MaterialModal({ material, onClose, onSaved }: {
  material?: Material;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: material?.name || '',
    description: material?.description || '',
    unit: material?.unit || 'UNITS',
    currentStock: material?.currentStock || 0,
    minimumStock: material?.minimumStock || 0,
    costPerUnit: material?.costPerUnit || '',
    supplier: material?.supplier || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (material) {
        await api.put(`/stock/materials/${material.id}`, form);
        toast.success('Material atualizado!');
      } else {
        await api.post('/stock/materials', form);
        toast.success('Material cadastrado!');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{material ? 'Editar Material' : 'Novo Material'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nome do Material *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Vidro Float 4mm"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input
                className="form-input"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes do material..."
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Unidade *</label>
                <select
                  className="form-select"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value as UnitType })}
                >
                  {Object.entries(UNIT_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <input
                  className="form-input"
                  value={form.supplier}
                  onChange={e => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Estoque Atual</label>
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  className="form-input"
                  value={form.currentStock}
                  onChange={e => setForm({ ...form, currentStock: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estoque Mínimo</label>
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  className="form-input"
                  value={form.minimumStock}
                  onChange={e => setForm({ ...form, minimumStock: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Custo por Unidade (R$)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="form-input"
                value={form.costPerUnit}
                onChange={e => setForm({ ...form, costPerUnit: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovementModal({ material, onClose, onSaved }: {
  material: Material;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ type: 'ENTRY' as MovementType, quantity: 1, reason: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/stock/movements', {
        materialId: material.id,
        ...form,
      });
      toast.success(`Movimentação de ${form.type === 'ENTRY' ? 'entrada' : 'saída'} registrada!`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Movimentação de Estoque</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ padding: '12px', background: 'var(--color-surface-2)', borderRadius: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{material.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                Estoque atual: {Number(material.currentStock).toFixed(3)} {UNIT_LABELS[material.unit]}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['ENTRY', 'EXIT', 'ADJUSTMENT'] as MovementType[]).map(t => (
                  <button
                    type="button"
                    key={t}
                    className={`btn ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: 12 }}
                    onClick={() => setForm({ ...form, type: t })}
                  >
                    {t === 'ENTRY' ? 'Entrada' : t === 'EXIT' ? 'Saída' : 'Ajuste'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade ({UNIT_LABELS[material.unit]})</label>
              <input
                type="number"
                step="0.001"
                min={0.001}
                className="form-input"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input
                className="form-input"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Ex: Compra, uso em produção..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | undefined>();
  const [movementMaterial, setMovementMaterial] = useState<Material | undefined>();
  const { subscribe } = useSocket();

  const fetchMaterials = async () => {
    const res = await api.get<Material[]>('/stock/materials');
    setMaterials(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  useEffect(() => {
    const u = subscribe('stock:updated', fetchMaterials);
    return u;
  }, [subscribe]);

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier || '').toLowerCase().includes(search.toLowerCase());
    const matchLow = !showLowOnly || m.isLowStock;
    return matchSearch && matchLow;
  });

  const lowCount = materials.filter(m => m.isLowStock).length;
  const totalValue = materials.reduce((acc, m) => acc + (Number(m.currentStock) * Number(m.costPerUnit || 0)), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Estoque</h1>
          <p className="page-subtitle">{materials.length} materiais cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditMaterial(undefined); setShowModal(true); }}>
          <Plus size={16} /> Novo Material
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid-3 mb-4">
        <div className="stat-card" style={{ '--card-accent': '#3b82f6' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            <Package size={20} />
          </div>
          <div className="stat-value">{materials.length}</div>
          <div className="stat-label">Total de Materiais</div>
        </div>
        <div className="stat-card" style={{ '--card-accent': lowCount > 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: lowCount > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', color: lowCount > 0 ? '#ef4444' : '#22c55e' }}>
            <TrendingDown size={20} />
          </div>
          <div className="stat-value">{lowCount}</div>
          <div className="stat-label">Estoque Crítico</div>
        </div>
        <div className="stat-card" style={{ '--card-accent': '#a855f7' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
            <SlidersHorizontal size={20} />
          </div>
          <div className="stat-value">R$ {totalValue.toFixed(0)}</div>
          <div className="stat-label">Valor Total em Estoque</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex gap-3 items-center">
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Buscar material ou fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`btn ${showLowOnly ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setShowLowOnly(!showLowOnly)}
          >
            <TrendingDown size={15} />
            Estoque Baixo
            {lowCount > 0 && <span className="nav-badge">{lowCount}</span>}
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Fornecedor</th>
              <th>Unidade</th>
              <th>Estoque Atual</th>
              <th>Mínimo</th>
              <th>Custo/Un</th>
              <th>Valor Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhum material encontrado</td></tr>
            ) : filtered.map(mat => {
              const stockRatio = Number(mat.minimumStock) > 0
                ? Number(mat.currentStock) / Number(mat.minimumStock)
                : 1;
              const isZero = Number(mat.currentStock) === 0;

              return (
                <tr key={mat.id} className={isZero ? 'row-danger' : mat.isLowStock ? 'row-warning' : ''}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{mat.name}</div>
                    {mat.description && <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{mat.description}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{mat.supplier || '-'}</td>
                  <td style={{ fontSize: 13 }}>{UNIT_LABELS[mat.unit]}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: isZero ? 'var(--color-danger)' : mat.isLowStock ? 'var(--color-warning)' : 'var(--color-text)',
                      }}>
                        {Number(mat.currentStock).toFixed(2)}
                      </div>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(stockRatio * 100, 100)}%`,
                          '--fill-color': isZero ? 'var(--color-danger)' : mat.isLowStock ? 'var(--color-warning)' : 'var(--color-success)',
                        } as React.CSSProperties}
                      />
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{Number(mat.minimumStock).toFixed(2)}</td>
                  <td style={{ fontSize: 13 }}>{mat.costPerUnit ? `R$ ${Number(mat.costPerUnit).toFixed(2)}` : '-'}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>
                    {mat.costPerUnit ? `R$ ${(Number(mat.currentStock) * Number(mat.costPerUnit)).toFixed(2)}` : '-'}
                  </td>
                  <td>
                    {isZero ? (
                      <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }}>SEM ESTOQUE</span>
                    ) : mat.isLowStock ? (
                      <span className="badge badge-pending">ESTOQUE BAIXO</span>
                    ) : (
                      <span className="badge badge-finished">OK</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-success btn-icon btn-sm"
                        title="Entrada de estoque"
                        onClick={() => setMovementMaterial(mat)}
                      >
                        <ArrowUpCircle size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Editar"
                        onClick={() => { setEditMaterial(mat); setShowModal(true); }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <MaterialModal
          material={editMaterial}
          onClose={() => setShowModal(false)}
          onSaved={fetchMaterials}
        />
      )}

      {movementMaterial && (
        <MovementModal
          material={movementMaterial}
          onClose={() => setMovementMaterial(undefined)}
          onSaved={fetchMaterials}
        />
      )}
    </div>
  );
}
