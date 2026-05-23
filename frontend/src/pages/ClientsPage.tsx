import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Client } from '../types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get<Client[]>('/clients');
      setClients(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setForm({ name: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('O nome do cliente é obrigatório');
    
    setSubmitting(true);
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, form);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clients', form);
        toast.success('Cliente cadastrado com sucesso!');
      }
      setShowModal(false);
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente remover o cliente "${name}"?`)) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente removido com sucesso!');
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover cliente');
    }
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clients.length} parceiros cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="card mb-6">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome ou contato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Pedidos</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhum cliente encontrado</td></tr>
            ) : filtered.map(client => (
              <tr key={client.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-1)' }}>{client.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} /> {client.address || 'Endereço não cadastrado'}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Mail size={12} /> {client.email || '-'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={12} /> {client.phone || '-'}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ padding: '2px 10px', background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', borderRadius: 12, display: 'inline-block', fontSize: 12, fontWeight: 700 }}>
                    {client._count?.orders || 0}
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>
                  {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(client)}><Edit2 size={16} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(client.id, client.name)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input 
                    type="text"
                    className="form-input" 
                    placeholder="Ex: Vidraçaria Calixto"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input 
                    type="email"
                    className="form-input" 
                    placeholder="Ex: contato@calixto.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input 
                    type="text"
                    className="form-input" 
                    placeholder="Ex: (11) 98888-7777"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço de Entrega</label>
                  <input 
                    type="text"
                    className="form-input" 
                    placeholder="Rua, Número, Bairro, Cidade..."
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
