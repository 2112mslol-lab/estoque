import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { Order, Client, Product } from '../types';
import api from '../services/api';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Selecione um cliente');
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
      <div className="modal modal-lg" style={{ maxWidth: 840 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{order ? 'Editar Entrada' : 'Nova Entrada de Produção'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select 
                  className="form-input" 
                  value={form.clientId} 
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 100px 40px', alignItems: 'end' }}>
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
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchOrders = async () => {
    const res = await api.get<Order[]>('/orders');
    setOrders(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.client.name.toLowerCase().includes(search.toLowerCase()) ||
    o.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Entrada de Produção</h1>
          <p className="page-subtitle">{orders.length} pedidos em fluxo</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nova Produção
        </button>
      </div>

      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por peça, cliente ou no. pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>No. Pedido</th>
              <th>Cliente</th>
              <th>Peças / Modelos</th>
              <th>Total Itens</th>
              <th>Entrega Prevista</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Sem peças em produção no momento</td></tr>
            ) : filtered.map(order => (
              <tr key={order.id}>
                <td>
                  <span style={{ 
                    padding: '4px 10px', 
                    border: '1px solid currentColor',
                    borderRadius: 6, 
                    fontSize: 11, 
                    fontWeight: 800,
                    color: order.status === 'PENDING' ? 'var(--color-warning)' : 'var(--color-success)'
                  }}>
                    {order.status}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--color-text-1)' }}>{order.orderNumber}</td>
                <td>{order.client.name}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {order.items.map((item, idx) => (
                      <span key={idx} style={{ 
                        fontSize: 11, 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '2px 8px', 
                        borderRadius: 4,
                        border: '1px solid var(--color-border)'
                      }}>
                        {item.quantity}x {item.productName}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {order.items.reduce((acc, i) => acc + i.quantity, 0)}
                </td>
                <td style={{ fontWeight: 600 }}>{format(new Date(order.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{format(new Date(order.createdAt), "dd/MM - HH:mm", { locale: ptBR })}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" title="Rastrear"><Eye size={16} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateOrderModal onClose={() => setShowModal(false)} onSaved={fetchOrders} />
      )}
    </div>
  );
}
