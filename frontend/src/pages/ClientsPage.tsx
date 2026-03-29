import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import type { Client } from '../types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = async () => {
    try {
      const res = await api.get<Client[]>('/clients');
      setClients(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

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
        <button className="btn btn-primary">
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
                    <button className="btn btn-ghost btn-sm"><Edit2 size={16} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
