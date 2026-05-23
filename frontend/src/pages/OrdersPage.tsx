import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, X, Share2, Star } from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { Order, Client, Product, OrderStatus } from '../types';
import { ORDER_STATUS_LABELS } from '../types';
import api from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#ef4444',
  IN_PRODUCTION: '#f59e0b',
  FINISHED: '#3b82f6',
  WAITING_CONFIRMATION: '#f97316',
  SHIPPED: '#a855f7',
  DELIVERED: '#10b981',
  CANCELLED: '#64748b',
};

interface OrderItemForm {
  productId: string;
  productName: string;
  customization: string;
  quantity: number;
}

function CreateOrderModal({ order, onClose, onSaved }: { 
  order?: Order; 
  onClose: () => void; 
  onSaved: () => void 
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  
  const [form, setForm] = useState({
    clientId: order?.clientId || '',
    deliveryDate: order?.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy-MM-dd') : '',
    notes: order?.notes || '',
  });
  
  const [items, setItems] = useState<OrderItemForm[]>(
    order?.items?.map(i => ({ 
      productId: i.productId,
      productName: i.productName, 
      customization: i.customization || '', 
      quantity: i.quantity 
    })) || [{ productId: '', productName: '', customization: '', quantity: 1 }]
  );

  const [loading, setLoading] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({ name: '', phone: '' });
  const [savingQuickClient, setSavingQuickClient] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/clients'),
      api.get('/products')
    ]).then(([resC, resP]) => {
      setClients(resC.data);
      setCatalog(resP.data);
    });
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: '', productName: '', customization: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemProductChange = (index: number, pid: string) => {
    const prod = catalog.find(p => p.id === pid);
    if (!prod) return;
    const newItems = [...items];
    newItems[index].productId = pid;
    newItems[index].productName = prod.name;
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof OrderItemForm, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSaveQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientForm.name.trim()) return toast.error('Nome do cliente é obrigatório');
    setSavingQuickClient(true);
    try {
      const res = await api.post('/clients', quickClientForm);
      toast.success('Cliente cadastrado!');
      const resClients = await api.get('/clients');
      setClients(resClients.data);
      setForm(prev => ({ ...prev, clientId: res.data.id }));
      setShowQuickClient(false);
      setQuickClientForm({ name: '', phone: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally {
      setSavingQuickClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.productId)) return toast.error('Selecione o modelo de todas as peças');
    
    setLoading(true);
    try {
      const payload = { ...form, items };
      if (order) {
        await api.put(`/orders/${order.id}`, payload);
        toast.success('Pedido atualizado');
      } else {
        await api.post('/orders', payload);
        toast.success('Entrada realizada com sucesso!');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{order ? 'Editar Entrada' : 'Nova Entrada de Produção'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Cliente (Opcional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select 
                    className="form-input" 
                    style={{ marginTop: 0 }}
                    value={form.clientId} 
                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    title="Cadastrar Novo Cliente"
                    style={{ padding: '10px 14px', flexShrink: 0 }}
                    onClick={() => setShowQuickClient(true)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Data Prevista de Entrega *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={form.deliveryDate}
                  onChange={e => setForm({ ...form, deliveryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Itens a Produzir (Puxe do Catálogo)</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                <Plus size={14} /> Adicionar Modelo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item, index) => (
                <div key={index} className="card" style={{ padding: 16, borderLeft: '4px solid var(--color-primary)' }}>
                  <div className="order-item-grid">
                    <div className="form-group">
                      <label className="form-label">Selecione o Modelo *</label>
                      <select 
                        className="form-input"
                        value={item.productId}
                        onChange={e => handleItemProductChange(index, e.target.value)}
                        required
                      >
                        <option value="">Selecione...</option>
                        {catalog.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Obs. Personalização</label>
                      <input 
                        className="form-input" 
                        placeholder="Ex: Cor Ámbar"
                        value={item.customization}
                        onChange={e => handleItemChange(index, 'customization', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quantidade</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="form-input" 
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                        required
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-ghost" 
                      style={{ color: 'var(--color-danger)', padding: 10 }}
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label">Considerações da Produção</label>
              <textarea 
                className="form-input" 
                rows={2} 
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: Peças frágeis, acabamento extra fino..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Iniciar Produção de Peças'}
            </button>
          </div>
        </form>
      </div>

      {showQuickClient && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setShowQuickClient(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cadastro Rápido de Cliente</h2>
              <button className="btn btn-ghost" onClick={() => setShowQuickClient(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveQuickClient}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nome do cliente"
                    value={quickClientForm.name}
                    onChange={e => setQuickClientForm({ ...quickClientForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Telefone"
                    value={quickClientForm.phone}
                    onChange={e => setQuickClientForm({ ...quickClientForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickClient(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingQuickClient}>
                  {savingQuickClient ? 'Salvando...' : 'Cadastrar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalhes do Pedido {order.orderNumber}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>CLIENTE</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{order.client?.name || 'Venda Avulsa / Estoque'}</div>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>PEÇAS EM PRODUÇÃO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{item.quantity}x {item.productName}</span>
                    <span style={{ 
                      fontSize: 11, 
                      padding: '2px 8px', 
                      borderRadius: 6,
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.03)',
                      color: STATUS_COLORS[item.status as string] || 'var(--color-primary)',
                      border: `1px solid ${STATUS_COLORS[item.status as string] || 'var(--color-primary)'}`
                    }}>
                      {ORDER_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                  {item.customization && <div style={{ fontSize: 12, color: 'var(--color-text-2)', fontStyle: 'italic' }}>Obs: {item.customization}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 4 }}>CONSIDERAÇÕES</div>
            <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 6 }}>{order.notes || 'Sem observações adicionais.'}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary w-full" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Filter and sort states
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<string>('DELIVERY_DATE_ASC');

  const fetchOrders = async () => {
    const res = await api.get<Order[]>('/orders');
    setOrders(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDelete = async (id: string, number: string) => {
    if (!window.confirm(`Deseja realmente excluir o pedido ${number}? Esta ação é permanente.`)) return;
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Pedido removido');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleOpenCreate = () => {
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success('Status atualizado!');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const filtered = orders
    .filter(o => 
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      o.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
    )
    .filter(o => filterStatus === 'ALL' || o.status === filterStatus)
    .filter(o => filterPriority === null || o.isPriority === filterPriority)
    .sort((a, b) => {
      if (sortBy === 'DELIVERY_DATE_ASC') {
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      } else if (sortBy === 'DELIVERY_DATE_DESC') {
        return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
      } else if (sortBy === 'ORDER_NUMBER_ASC') {
        return a.orderNumber.localeCompare(b.orderNumber);
      } else if (sortBy === 'ORDER_NUMBER_DESC') {
        return b.orderNumber.localeCompare(a.orderNumber);
      } else if (sortBy === 'CREATED_DATE_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

  const handleShareTracking = (order: Order) => {
    const trackingUrl = `${window.location.origin}/tracking/${order.id}`;
    const message = `Olá! Acompanhe o progresso do seu pedido na Toque Ideal através deste link: ${trackingUrl}`;
    
    navigator.clipboard.writeText(message).then(() => {
      toast.success('Mensagem de rastreio copiada!');
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  };

  const handleTogglePriority = async (order: Order) => {
    try {
      await api.patch(`/orders/${order.id}/priority`, { isPriority: !order.isPriority });
      toast.success(order.isPriority ? 'Prioridade removida' : 'Pedido marcado como prioritário! ⭐');
      fetchOrders();
    } catch (err) {
      toast.error('Erro ao mudar prioridade');
    }
  };


  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão de Pedidos & Logística</h1>
          <p className="page-subtitle">{orders.length} pedidos em fluxo operacional</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Nova Produção
        </button>
      </div>

      <div className="card mb-6 shadow-premium" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', minWidth: 300, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36, marginTop: 0 }}
            placeholder="Buscar por peça, cliente ou no. pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Status:</span>
            <select 
              className="form-input" 
              style={{ width: 140, marginTop: 0, padding: '8px 12px', height: 38 }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Todos</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Prioridade:</span>
            <select 
              className="form-input" 
              style={{ width: 130, marginTop: 0, padding: '8px 12px', height: 38 }}
              value={filterPriority === null ? 'ALL' : filterPriority ? 'PRIORITY' : 'NORMAL'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'ALL') setFilterPriority(null);
                else if (val === 'PRIORITY') setFilterPriority(true);
                else setFilterPriority(false);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="PRIORITY">Prioritários</option>
              <option value="NORMAL">Normais</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Ordenar por:</span>
            <select 
              className="form-input" 
              style={{ width: 180, marginTop: 0, padding: '8px 12px', height: 38 }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="DELIVERY_DATE_ASC">Data de Entrega (Crescente)</option>
              <option value="DELIVERY_DATE_DESC">Data de Entrega (Decrescente)</option>
              <option value="ORDER_NUMBER_ASC">No. Pedido (A-Z)</option>
              <option value="ORDER_NUMBER_DESC">No. Pedido (Z-A)</option>
              <option value="CREATED_DATE_DESC">Data de Criação (Mais recente)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container shadow-premium">
        <table style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th style={{ width: 180 }}>📍 Status Logístico</th>
              <th style={{ width: 40 }}>⭐</th>
              <th style={{ width: 120 }}>No. Pedido</th>
              <th>Cliente</th>
              <th>Peça / Quantidade</th>
              <th style={{ width: 100 }}>Entrega</th>
              <th style={{ width: 120 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>Sincronizando logistica...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhum pedido em fluxo agora.</td></tr>
            ) : filtered.map(order => (
              <tr key={order.id} style={{ background: 'rgba(255,255,255,0.01)' }}>
                <td>
                   <select 
                     value={order.status}
                     onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                     style={{ 
                       background: STATUS_COLORS[order.status] || 'var(--color-surface-3)',
                       color: 'white',
                       border: 'none',
                       borderRadius: 6,
                       fontSize: 11,
                       fontWeight: 800,
                       padding: '4px 8px',
                       cursor: 'pointer',
                       width: '100%',
                       textTransform: 'uppercase'
                     }}
                   >
                     {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                       <option key={val} value={val} style={{ background: 'var(--color-surface-2)', color: 'white' }}>
                         {label}
                       </option>
                     ))}
                   </select>
                </td>
                 <td>
                   <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => handleTogglePriority(order)}
                    style={{ color: order.isPriority ? 'var(--color-warning)' : 'var(--color-text-3)' }}
                   >
                     <Star size={18} fill={order.isPriority ? 'currentColor' : 'none'} />
                   </button>
                 </td>
                 <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{order.orderNumber}</td>

                 <td style={{ fontWeight: 600 }}>
                   {order.client?.name || <span style={{ color: 'var(--color-text-3)', fontSize: 11, fontWeight: 400 }}>📦 Venda Avulsa / Estoque</span>}
                 </td>
                
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} style={{ fontSize: 12, fontWeight: 700 }}>
                        {item.quantity}x {item.productName}
                      </div>
                    ))}
                    {order.items.length > 2 && <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>+ {order.items.length - 2} itens...</div>}
                  </div>
                </td>

                <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-warning)' }}>
                   {format(new Date(order.deliveryDate), "dd/MM", { locale: ptBR })}
                </td>

                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" title="Rastreio Público" style={{ color: 'var(--color-primary)' }} onClick={() => handleShareTracking(order)}><Share2 size={16} /></button>
                    <button className="btn btn-ghost btn-sm" title="Detalhes" onClick={() => setViewOrder(order)}><Eye size={16} /></button>
                    <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => handleEdit(order)}><Edit2 size={16} /></button>
                    <button className="btn btn-ghost btn-sm" title="Excluir" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(order.id, order.orderNumber)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateOrderModal order={selectedOrder || undefined} onClose={() => setShowModal(false)} onSaved={fetchOrders} />
      )}

      {viewOrder && (
        <ViewOrderModal order={viewOrder} onClose={() => setViewOrder(null)} />
      )}
    </div>
  );
}
