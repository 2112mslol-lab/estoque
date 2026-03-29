import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product } from '../types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '' });

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return toast.error('Nome é obrigatório');
    try {
      await api.post('/products', newProduct);
      toast.success('Modelo cadastrado com sucesso!');
      setNewProduct({ name: '', description: '' });
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error('Erro ao cadastrar modelo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este modelo? Isso não afetará pedidos antigos.')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Modelo excluído');
      fetchProducts();
    } catch (err) {
      toast.error('Não é possível excluir modelos vinculados a pedidos');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Modelos</h1>
          <p className="page-subtitle">Cadastre os itens que sua fábrica produz</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Novo Modelo
        </button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {loading ? (
          <p>Carregando catálogo...</p>
        ) : products.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--color-text-3)' }}>Nenhum modelo cadastrado ainda.</p>
          </div>
        ) : products.map(prod => (
          <div key={prod.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: 8, borderRadius: 8 }}>
                  <Package size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{prod.name}</h3>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{prod.description || 'Sem descrição'}</p>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ color: 'var(--color-danger)' }}
              onClick={() => handleDelete(prod.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Modelo de Vidro</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Modelo *</label>
                  <input 
                    className="form-input" 
                    placeholder="Ex: Vaso Tulipa G"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição Técnica</label>
                  <textarea 
                    className="form-input" 
                    rows={3}
                    placeholder="Ex: Vidro 6mm, Detalhe Jateado..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
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
