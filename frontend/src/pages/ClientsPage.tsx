import { useEffect, useState } from 'react';
import {
  Plus, Search, Edit2, Trash2, Mail, Phone, MapPin,
  Instagram, X, Building2, User, Star, FileText,
  ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Client } from '../types';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];

const EMPTY_FORM = {
  type: 'PF' as 'PF' | 'PJ',
  name: '',
  cpfCnpj: '',
  email: '',
  phone: '',
  phone2: '',
  instagram: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  notes: '',
  isVip: false,
};

function formatDoc(value: string, type: 'PF' | 'PJ') {
  const digits = value.replace(/\D/g, '');
  if (type === 'PF') {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, '');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

function getAddressLine(c: Client) {
  const parts = [c.street, c.number, c.complement, c.neighborhood, c.city, c.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : c.address || null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ' | 'VIP'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get<Client[]>('/clients');
      setClients(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  // ── Busca de CEP via ViaCEP ──────────────────────────────────────────────────
  const handleCepBlur = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return toast.error('CEP não encontrado');
      setForm(f => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
      toast.success('Endereço preenchido!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setFetchingCep(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      type: client.type || 'PF',
      name: client.name,
      cpfCnpj: client.cpfCnpj || '',
      email: client.email || '',
      phone: client.phone || '',
      phone2: client.phone2 || '',
      instagram: client.instagram || '',
      zipCode: client.zipCode || '',
      street: client.street || '',
      number: client.number || '',
      complement: client.complement || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || '',
      notes: client.notes || '',
      isVip: client.isVip || false,
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
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/clients', form);
        toast.success('Cliente cadastrado!');
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
    if (!window.confirm(`Remover o cliente "${name}"?`)) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente removido');
      fetchClients();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover cliente');
    }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.cpfCnpj?.includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.instagram?.toLowerCase().includes(q);

    const matchType =
      filterType === 'ALL' ? true :
      filterType === 'VIP' ? c.isVip :
      c.type === filterType;

    return matchSearch && matchType;
  });

  const set = (k: keyof typeof EMPTY_FORM, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Label de identificação no card ──────────────────────────────────────────
  const DocLabel = ({ c }: { c: Client }) => {
    if (!c.cpfCnpj) return null;
    return (
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontFamily: 'monospace' }}>
        {c.type === 'PF' ? 'CPF' : 'CNPJ'}: {c.cpfCnpj}
      </span>
    );
  };

  return (
    <div className="fade-in">
      {/* ── Cabeçalho ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            {clients.length} parceiro{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}
            {clients.filter(c => c.isVip).length > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--color-warning)', fontWeight: 700 }}>
                · {clients.filter(c => c.isVip).length} VIP ⭐
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome, CPF, cidade, e-mail..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'PF', 'PJ', 'VIP'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => setFilterType(t)}
              className={filterType === t ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {t === 'ALL' ? 'Todos' : t === 'VIP' ? '⭐ VIP' : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabela / Cards ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="hide-sm">Contato</th>
              <th className="hide-mobile">Localização</th>
              <th className="hide-tablet" style={{ textAlign: 'center' }}>Pedidos</th>
              <th className="hide-mobile">Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>Nenhum cliente encontrado</td></tr>
            ) : filtered.map(client => {
              const isExpanded = expandedId === client.id;
              const addrLine = getAddressLine(client);
              return (
                <>
                  <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : client.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Ícone PF/PJ */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: client.isVip
                            ? 'rgba(245,158,11,0.12)'
                            : client.type === 'PJ' ? 'rgba(99,102,241,0.12)' : 'rgba(59,130,246,0.12)',
                          color: client.isVip ? 'var(--color-warning)' : client.type === 'PJ' ? '#6366f1' : 'var(--color-primary)',
                        }}>
                          {client.isVip ? <Star size={16} fill="currentColor" /> : client.type === 'PJ' ? <Building2 size={16} /> : <User size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {client.name}
                            {client.isVip && <span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>VIP</span>}
                          </div>
                          <DocLabel c={client} />
                        </div>
                      </div>
                    </td>
                    <td className="hide-sm">
                      <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {client.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={11} style={{ opacity: 0.5 }} />{client.email}</span>}
                        {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={11} style={{ opacity: 0.5 }} />{client.phone}</span>}
                        {client.instagram && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#e1306c' }}><Instagram size={11} />@{client.instagram.replace('@', '')}</span>}
                        {!client.email && !client.phone && !client.instagram && <span style={{ color: 'var(--color-text-3)', opacity: 0.5 }}>—</span>}
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        {addrLine ? <><MapPin size={11} style={{ marginTop: 1, flexShrink: 0 }} /><span>{client.city}{client.state ? `/${client.state}` : ''}</span></> : <span style={{ opacity: 0.4 }}>—</span>}
                      </div>
                    </td>
                    <td className="hide-tablet" style={{ textAlign: 'center' }}>
                      <span style={{ padding: '2px 10px', background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                        {client._count?.orders || 0}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                      {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-3)', padding: '4px 6px' }}
                          onClick={() => setExpandedId(isExpanded ? null : client.id)} title="Ver detalhes">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(client)} title="Editar"><Edit2 size={14} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(client.id, client.name)} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Linha expandida com detalhes ── */}
                  {isExpanded && (
                    <tr key={`${client.id}-detail`}>
                      <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)',
                          padding: '16px 20px', display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 24px'
                        }}>
                          {client.phone && (
                            <div className="hide-sm-block">
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>WhatsApp / Celular</div>
                              <div style={{ fontSize: 13 }}>{client.phone}</div>
                            </div>
                          )}
                          {client.phone2 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Telefone Alternativo</div>
                              <div style={{ fontSize: 13 }}>{client.phone2}</div>
                            </div>
                          )}
                          {client.email && (
                            <div className="hide-sm-block">
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>E-mail</div>
                              <div style={{ fontSize: 13 }}>{client.email}</div>
                            </div>
                          )}
                          {client.instagram && (
                            <div className="hide-sm-block">
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Instagram</div>
                              <div style={{ fontSize: 13, color: '#e1306c' }}>@{client.instagram.replace('@', '')}</div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Pedidos Realizados</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{client._count?.orders || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Data de Cadastro</div>
                            <div style={{ fontSize: 13 }}>
                              {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
                            </div>
                          </div>
                          {addrLine && (
                            <div style={{ gridColumn: 'span 2' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Endereço Completo</div>
                              <div style={{ fontSize: 13 }}>
                                {[client.street, client.number, client.complement].filter(Boolean).join(', ')}
                                {client.neighborhood && <span style={{ color: 'var(--color-text-3)' }}> · {client.neighborhood}</span>}
                                {(client.city || client.state) && (
                                  <span style={{ color: 'var(--color-text-3)' }}>
                                    {' · '}{[client.city, client.state].filter(Boolean).join('/')}
                                  </span>
                                )}
                                {client.zipCode && <span style={{ color: 'var(--color-text-3)' }}> · CEP {client.zipCode}</span>}
                              </div>
                            </div>
                          )}
                          {client.notes && (
                            <div style={{ gridColumn: 'span 2' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 3 }}>Observações</div>
                              <div style={{ fontSize: 13, color: 'var(--color-text-2)', fontStyle: 'italic' }}>{client.notes}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─────────────── MODAL ─────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h2 className="modal-title">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Seção: Identificação ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={12} /> Identificação
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['PF', 'PJ'] as const).map(t => (
                        <button key={t} type="button"
                          onClick={() => set('type', t)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none',
                            background: form.type === t ? 'var(--color-primary)' : 'var(--color-surface-2)',
                            color: form.type === t ? 'white' : 'var(--color-text-3)',
                            transition: 'all 0.15s'
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{form.type === 'PF' ? 'CPF' : 'CNPJ'}</label>
                    <input className="form-input" placeholder={form.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      value={form.cpfCnpj}
                      onChange={e => set('cpfCnpj', formatDoc(e.target.value, form.type))}
                      maxLength={form.type === 'PF' ? 14 : 18}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nome {form.type === 'PJ' ? 'da Empresa' : 'Completo'} *</label>
                    <input className="form-input" placeholder={form.type === 'PJ' ? 'Ex: Vidraçaria Calixto Ltda' : 'Ex: João da Silva'}
                      value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div style={{ marginBottom: 0, paddingBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Star size={12} style={{ color: 'var(--color-warning)' }} /> VIP
                    </label>
                    <button type="button"
                      onClick={() => set('isVip', !form.isVip)}
                      style={{
                        width: '100%', height: 42, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        background: form.isVip ? 'rgba(245,158,11,0.15)' : 'var(--color-surface-2)',
                        color: form.isVip ? 'var(--color-warning)' : 'var(--color-text-3)',
                        border: form.isVip ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                        transition: 'all 0.15s'
                      }}>
                      {form.isVip ? '⭐ VIP' : '☆ Normal'}
                    </button>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

              {/* ── Seção: Contato ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={12} /> Contato
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">WhatsApp / Celular</label>
                    <input className="form-input" placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={e => set('phone', formatPhone(e.target.value))}
                      maxLength={15} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone Alternativo</label>
                    <input className="form-input" placeholder="(11) 3333-4444"
                      value={form.phone2}
                      onChange={e => set('phone2', formatPhone(e.target.value))}
                      maxLength={15} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" placeholder="contato@empresa.com"
                      value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Instagram size={12} style={{ color: '#e1306c' }} /> Instagram
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', fontSize: 14 }}>@</span>
                      <input className="form-input" style={{ paddingLeft: 28 }} placeholder="nomедаempresa"
                        value={form.instagram.replace('@', '')}
                        onChange={e => set('instagram', e.target.value.replace('@', ''))} />
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

              {/* ── Seção: Endereço ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} /> Endereço
                </div>

                {/* CEP */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input" placeholder="00000-000"
                        value={form.zipCode}
                        onChange={e => {
                          const d = e.target.value.replace(/\D/g, '').slice(0, 8);
                          set('zipCode', d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
                        }}
                        onBlur={e => handleCepBlur(e.target.value)}
                        maxLength={9} />
                      {fetchingCep && <Loader2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Logradouro</label>
                    <input className="form-input" placeholder="Rua, Avenida..."
                      value={form.street} onChange={e => set('street', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Número</label>
                    <input className="form-input" placeholder="123"
                      value={form.number} onChange={e => set('number', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Complemento</label>
                    <input className="form-input" placeholder="Apto, Sala, Bloco..."
                      value={form.complement} onChange={e => set('complement', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input className="form-input" placeholder="Bairro"
                      value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" placeholder="São Paulo"
                      value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">UF</label>
                    <select className="form-input" value={form.state} onChange={e => set('state', e.target.value)}>
                      <option value="">—</option>
                      {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

              {/* ── Seção: Observações ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={12} /> Observações Internas
                </div>
                <textarea className="form-input" rows={3}
                  placeholder="Ex: Prefere entrega às terças, cliente indicado por João..."
                  value={form.notes} onChange={e => set('notes', e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
