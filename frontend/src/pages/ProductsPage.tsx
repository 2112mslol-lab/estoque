import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Package, Pencil, Check, X, Palette, Tag, ChevronDown, ChevronUp, Camera, ImageOff, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product } from '../types';

const API_BASE = 'http://localhost:3001';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
  '#84cc16', '#14b8a6', '#6366f1', '#a855f7', '#d946ef',
  '#ffffff', '#e5e7eb', '#9ca3af', '#4b5563', '#1f2937',
  '#7c3aed', '#b45309', '#065f46', '#1e3a5f', '#000000',
];

type EditingProduct = {
  id: string;
  name: string;
  description: string;
  colors: string[];
  details: string[];
  imageUrl?: string;
};

function ProductImage({ imageUrl, name, size = 64 }: { imageUrl?: string; name: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!imageUrl || error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size > 80 ? 12 : 8,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '1px solid rgba(255,255,255,0.07)'
      }}>
        <Package size={size * 0.4} style={{ color: 'var(--color-primary)', opacity: 0.7 }} />
      </div>
    );
  }
  return (
    <img
      src={`${API_BASE}/${imageUrl}`}
      alt={name}
      onError={() => setError(true)}
      style={{
        width: size, height: size, borderRadius: size > 80 ? 12 : 8,
        objectFit: 'cover', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    />
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const newFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const [newProduct, setNewProduct] = useState({
    name: '', description: '', colors: [] as string[], details: [] as string[],
  });
  const [newDetailInput, setNewDetailInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('#3b82f6');
  const [editDetailInput, setEditDetailInput] = useState('');
  const [editColorInput, setEditColorInput] = useState('#3b82f6');

  // Imagem temporária para novo produto (só sobe após criar)
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newProductPreview, setNewProductPreview] = useState<string>('');

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // ── Upload de imagem para produto existente ──────────────────────────────────
  const handleImageUpload = async (productId: string, file: File) => {
    setUploadingId(productId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/products/${productId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Foto atualizada!');
      fetchProducts();
    } catch {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveImage = async (productId: string) => {
    try {
      await api.delete(`/products/${productId}/image`);
      toast.success('Foto removida');
      fetchProducts();
    } catch {
      toast.error('Erro ao remover imagem');
    }
  };

  // ── Criar produto (+ upload da imagem se houver) ─────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return toast.error('Nome é obrigatório');
    try {
      const res = await api.post('/products', newProduct);
      const created: Product = res.data;

      if (newProductFile) {
        const formData = new FormData();
        formData.append('image', newProductFile);
        await api.post(`/products/${created.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Modelo cadastrado!');
      setNewProduct({ name: '', description: '', colors: [], details: [] });
      setNewDetailInput('');
      setNewColorInput('#3b82f6');
      setNewProductFile(null);
      setNewProductPreview('');
      setShowModal(false);
      fetchProducts();
    } catch {
      toast.error('Erro ao cadastrar modelo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este modelo? Isso não afetará pedidos antigos.')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Modelo excluído');
      fetchProducts();
    } catch {
      toast.error('Não é possível excluir modelos vinculados a pedidos');
    }
  };

  const handleShareCatalog = async () => {
    try {
      const res = await api.get('/configs/catalog-link');
      // Extrair o token do link ou usar o padrão se o backend retornar a URL completa
      const linkBackend = res.data.link || '';
      const token = linkBackend.split('/').pop() || 'catalogo-toque-ideal-2025';
      const link = `${window.location.origin}/catalogo/${token}`;
      
      await navigator.clipboard.writeText(link);
      toast.success('Link do catálogo copiado para a área de transferência!');
    } catch {
      toast.error('Erro ao buscar o link do catálogo');
    }
  };

  const handleStartEdit = (prod: Product) => {
    setEditingProduct({
      id: prod.id,
      name: prod.name,
      description: prod.description || '',
      colors: prod.colors ? [...prod.colors] : [],
      details: prod.details ? [...prod.details] : [],
      imageUrl: prod.imageUrl,
    });
    setEditDetailInput('');
    setEditColorInput('#3b82f6');
    setExpandedId(prod.id);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name.trim()) return toast.error('Nome é obrigatório');
    try {
      await api.put(`/products/${editingProduct.id}`, editingProduct);
      toast.success('Modelo atualizado!');
      setEditingProduct(null);
      fetchProducts();
    } catch {
      toast.error('Erro ao salvar alterações');
    }
  };

  // ── Helpers cores/detalhes novo ──────────────────────────────────────────────
  const addNewColor = (hex: string) => { if (!hex || newProduct.colors.includes(hex)) return; setNewProduct(p => ({ ...p, colors: [...p.colors, hex] })); };
  const removeNewColor = (hex: string) => setNewProduct(p => ({ ...p, colors: p.colors.filter(c => c !== hex) }));
  const addNewDetail = () => { const v = newDetailInput.trim(); if (!v || newProduct.details.includes(v)) return; setNewProduct(p => ({ ...p, details: [...p.details, v] })); setNewDetailInput(''); };
  const removeNewDetail = (d: string) => setNewProduct(p => ({ ...p, details: p.details.filter(x => x !== d) }));

  // ── Helpers cores/detalhes edição ────────────────────────────────────────────
  const addEditColor = (hex: string) => { if (!editingProduct || !hex || editingProduct.colors.includes(hex)) return; setEditingProduct(p => p ? { ...p, colors: [...p.colors, hex] } : p); };
  const removeEditColor = (hex: string) => setEditingProduct(p => p ? { ...p, colors: p.colors.filter(c => c !== hex) } : p);
  const addEditDetail = () => { if (!editingProduct) return; const v = editDetailInput.trim(); if (!v || editingProduct.details.includes(v)) return; setEditingProduct(p => p ? { ...p, details: [...p.details, v] } : p); setEditDetailInput(''); };
  const removeEditDetail = (d: string) => setEditingProduct(p => p ? { ...p, details: p.details.filter(x => x !== d) } : p);

  // ── Componente de upload inline ──────────────────────────────────────────────
  const UploadZone = ({ productId, imageUrl }: { productId: string; imageUrl?: string }) => (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      <input
        ref={editFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(productId, file);
          e.target.value = '';
        }}
      />
      <div
        onClick={() => editFileRef.current?.click()}
        style={{
          width: '100%', height: 140, borderRadius: 10,
          border: '2px dashed rgba(255,255,255,0.1)',
          background: imageUrl ? 'transparent' : 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploadingId === productId ? 'wait' : 'pointer',
          overflow: 'hidden', position: 'relative',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        {imageUrl ? (
          <>
            <img
              src={`${API_BASE}/${imageUrl}`}
              alt="produto"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <Camera size={24} style={{ color: 'white', marginBottom: 6 }} />
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>Trocar foto</span>
            </div>
          </>
        ) : uploadingId === productId ? (
          <div style={{ textAlign: 'center', opacity: 0.7 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Enviando...</span>
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <Camera size={28} style={{ color: 'var(--color-primary)', margin: '0 auto 8px' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Clique para adicionar foto</span>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>JPEG, PNG, WEBP · máx 8MB</div>
          </div>
        )}
      </div>
      {imageUrl && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); handleRemoveImage(productId); }}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: 6,
            color: 'white', cursor: 'pointer', padding: '3px 7px',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <ImageOff size={11} /> Remover
        </button>
      )}
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Modelos</h1>
          <p className="page-subtitle">Gerencie os itens que sua fábrica produz, com fotos, cores e detalhes técnicos</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleShareCatalog} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={16} /> Compartilhar Catálogo
          </button>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingProduct(null); }}>
            <Plus size={16} /> Novo Modelo
          </button>
        </div>
      </div>

      {/* Grid de cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginTop: 8 }}>
        {loading ? (
          <p style={{ color: 'var(--color-text-3)', gridColumn: '1/-1', padding: 40 }}>Carregando catálogo...</p>
        ) : products.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60 }}>
            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ color: 'var(--color-text-3)' }}>Nenhum modelo cadastrado ainda.</p>
          </div>
        ) : products.map(prod => {
          const isEditing = editingProduct?.id === prod.id;
          const isExpanded = expandedId === prod.id;

          return (
            <div key={prod.id} className="card" style={{
              border: isEditing ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              transition: 'border-color 0.2s', padding: 0, overflow: 'hidden'
            }}>
              {/* ── Cabeçalho ── */}
              <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {/* Miniatura */}
                  <ProductImage imageUrl={prod.imageUrl} name={prod.name} size={52} />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    {isEditing ? (
                      <input className="form-input" style={{ fontWeight: 700, fontSize: 14, padding: '4px 8px', height: 'auto' }}
                        value={editingProduct.name}
                        onChange={e => setEditingProduct(p => p ? { ...p, name: e.target.value } : p)}
                      />
                    ) : (
                      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.name}
                      </h3>
                    )}
                    {/* Cor bolinhas */}
                    {!isEditing && prod.colors && prod.colors.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {prod.colors.map(c => (
                          <div key={c} title={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 6 }}>
                  {isEditing ? (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-success)' }} onClick={handleSaveEdit} title="Salvar"><Check size={16} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-3)' }} onClick={() => setEditingProduct(null)} title="Cancelar"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }} onClick={() => handleStartEdit(prod)} title="Editar"><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-3)' }} onClick={() => setExpandedId(isExpanded ? null : prod.id)}>{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(prod.id)} title="Excluir"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Área expandida / edição ── */}
              {(isEditing || isExpanded) && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Foto */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={12} style={{ color: 'var(--color-primary)' }} /> Foto do Produto
                    </div>
                    {isEditing ? (
                      <UploadZone productId={prod.id} imageUrl={editingProduct?.imageUrl} />
                    ) : prod.imageUrl ? (
                      <img src={`${API_BASE}/${prod.imageUrl}`} alt={prod.name}
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 80, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.5 }}>Sem foto cadastrada</span>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 6 }}>Descrição Técnica</div>
                    {isEditing ? (
                      <textarea className="form-input" rows={2} style={{ fontSize: 13, resize: 'vertical' }}
                        value={editingProduct.description}
                        onChange={e => setEditingProduct(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Ex: Vidro 6mm, Detalhe Jateado..."
                      />
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{prod.description || <span style={{ opacity: 0.5 }}>Sem descrição</span>}</p>
                    )}
                  </div>

                  {/* Cores */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Palette size={12} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Cores Disponíveis</span>
                    </div>
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {editingProduct.colors.map(c => (
                            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{c}</span>
                              <button onClick={() => removeEditColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', lineHeight: 1 }}><X size={11} /></button>
                            </div>
                          ))}
                          {editingProduct.colors.length === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.5 }}>Nenhuma cor</span>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {PRESET_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => addEditColor(c)} title={c} style={{
                              width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer',
                              border: editingProduct.colors.includes(c) ? '2px solid white' : '1px solid rgba(255,255,255,0.15)',
                              transform: editingProduct.colors.includes(c) ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.1s'
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={editColorInput} onChange={e => setEditColorInput(e.target.value)}
                            style={{ width: 34, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 2, background: 'transparent' }} />
                          <input className="form-input" style={{ flex: 1, fontSize: 12, height: 34 }} value={editColorInput} onChange={e => setEditColorInput(e.target.value)} placeholder="Hex..." />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addEditColor(editColorInput)} style={{ height: 34, padding: '0 12px' }}><Plus size={13} /></button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {prod.colors && prod.colors.length > 0 ? prod.colors.map(c => (
                          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                            <span style={{ fontSize: 11, color: 'var(--color-text-2)' }}>{c}</span>
                          </div>
                        )) : <span style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.5 }}>Nenhuma cor</span>}
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Tag size={12} style={{ color: 'var(--color-warning)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Detalhes / Atributos</span>
                    </div>
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {editingProduct.details.map(d => (
                            <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                              {d}<button onClick={() => removeEditDetail(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-warning)', lineHeight: 1 }}><X size={10} /></button>
                            </span>
                          ))}
                          {editingProduct.details.length === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.5 }}>Nenhum detalhe</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="form-input" style={{ flex: 1, fontSize: 12, height: 34 }} placeholder="Ex: Vidro 6mm..." value={editDetailInput}
                            onChange={e => setEditDetailInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditDetail(); } }} />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={addEditDetail} style={{ height: 34, padding: '0 12px' }}><Plus size={13} /></button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {prod.details && prod.details.length > 0 ? prod.details.map(d => (
                          <span key={d} style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{d}</span>
                        )) : <span style={{ fontSize: 12, color: 'var(--color-text-3)', opacity: 0.5 }}>Nenhum detalhe</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── MODAL NOVO MODELO ─────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreate}>
              <div className="modal-header">
                <h2 className="modal-title">Novo Modelo de Produto</h2>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Foto (upload antecipado com preview) */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={13} style={{ color: 'var(--color-primary)' }} /> Foto do Produto
                  </label>
                  <input ref={newFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNewProductFile(file);
                      const reader = new FileReader();
                      reader.onload = ev => setNewProductPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div
                    onClick={() => newFileRef.current?.click()}
                    style={{
                      width: '100%', height: 130, borderRadius: 10,
                      border: '2px dashed rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    {newProductPreview ? (
                      <>
                        <img src={newProductPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                        >
                          <Camera size={22} style={{ color: 'white' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.5 }}>
                        <Camera size={26} style={{ color: 'var(--color-primary)', margin: '0 auto 8px' }} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Clique para adicionar foto</span>
                        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>JPEG, PNG, WEBP · máx 8MB</div>
                      </div>
                    )}
                  </div>
                  {newProductPreview && (
                    <button type="button" style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => { setNewProductFile(null); setNewProductPreview(''); if (newFileRef.current) newFileRef.current.value = ''; }}>
                      <ImageOff size={12} /> Remover foto
                    </button>
                  )}
                </div>

                {/* Nome */}
                <div className="form-group">
                  <label className="form-label">Nome do Modelo *</label>
                  <input className="form-input" placeholder="Ex: Vaso Tulipa G"
                    value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                </div>

                {/* Descrição */}
                <div className="form-group">
                  <label className="form-label">Descrição Técnica</label>
                  <textarea className="form-input" rows={2} placeholder="Ex: Vidro 6mm, Detalhe Jateado..."
                    value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} style={{ resize: 'vertical' }} />
                </div>

                {/* Cores */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Palette size={13} style={{ color: 'var(--color-primary)' }} /> Cores Disponíveis
                  </label>
                  {newProduct.colors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {newProduct.colors.map(c => (
                        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
                          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{c}</span>
                          <button type="button" onClick={() => removeNewColor(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', lineHeight: 1 }}><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => addNewColor(c)} title={c} style={{
                        width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer',
                        border: newProduct.colors.includes(c) ? '2px solid white' : '1px solid rgba(255,255,255,0.15)',
                        transform: newProduct.colors.includes(c) ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.1s'
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={newColorInput} onChange={e => setNewColorInput(e.target.value)}
                      style={{ width: 34, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 2, background: 'transparent' }} />
                    <input className="form-input" style={{ flex: 1, fontSize: 12, height: 34 }} value={newColorInput} onChange={e => setNewColorInput(e.target.value)} placeholder="Hex..." />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => addNewColor(newColorInput)} style={{ height: 34, padding: '0 12px' }}><Plus size={13} /></button>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={13} style={{ color: 'var(--color-warning)' }} /> Detalhes / Atributos
                  </label>
                  {newProduct.details.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {newProduct.details.map(d => (
                        <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                          {d}<button type="button" onClick={() => removeNewDetail(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-warning)', lineHeight: 1 }}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" style={{ flex: 1, fontSize: 12, height: 34 }} placeholder="Ex: Vidro 6mm, Bordas polidas..."
                      value={newDetailInput} onChange={e => setNewDetailInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewDetail(); } }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addNewDetail} style={{ height: 34, padding: '0 12px' }}><Plus size={13} /></button>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar no Catálogo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
