import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { Client } from '../types';
import api from '../services/api';

function ClientModal({ client, onClose, onSaved }: {
  client?: Client;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (client) {
        await api.put(`/clients/${client.id}`, form);
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/clients', form);
        toast.success('Cliente cadastrado!');
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
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{client ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo ou razão social"
                required
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input
                className="form-input"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | undefined>();

  const fetchClients = async () => {
    const res = await api.get<Client[]>('/clients');
    setClients(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Clientes com pedidos não podem ser excluídos.')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente excluído');
      fetchClients();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditClient(undefined); setShowModal(true); }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="card mb-4">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Pedidos</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhum cliente encontrado</td></tr>
            ) : filtered.map(client => (
              <tr key={client.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'rgba(59,130,246,0.15)',
                      color: 'var(--color-primary-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                    }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{client.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{client.email || '-'}</td>
                <td style={{ fontSize: 13 }}>{client.phone || '-'}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-2)', maxWidth: 200 }}>{client.address || '-'}</td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(59,130,246,0.1)',
                    color: 'var(--color-primary-400)',
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    <Users size={11} />
                    {client._count?.orders || 0}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                  {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => { setEditClient(client); setShowModal(true); }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ClientModal
          client={editClient}
          onClose={() => setShowModal(false)}
          onSaved={fetchClients}
        />
      )}
    </div>
  );
}
