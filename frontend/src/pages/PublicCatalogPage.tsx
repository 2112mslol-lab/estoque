import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Package,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  Trash2,
  ShoppingBag,
  Calendar,
  User,
  Phone,
  FileText,
  Lock,
  Loader2,
} from 'lucide-react';
import { BorderType, buildCustomization } from '../types/parseBorder';

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  colors: string[] | null;
  details: string[] | null;
  imageUrl: string | null;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  customization: string;
  selectedColor: string | null;
  borderType: BorderType;
}

type Step = 'catalog' | 'cart' | 'form' | 'success';

// ── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return digits
      .substring(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return digits
    .substring(0, 11)
    .replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    .trim();
}

function getImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return `${API_BASE}/${imageUrl}`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      id={`color-swatch-${color.replace('#', '')}`}
      onClick={onClick}
      title={color}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: color,
        border: selected ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
        boxShadow: selected ? `0 0 0 3px ${color}88` : 'none',
        transition: 'all 0.2s ease',
        transform: selected ? 'scale(1.15)' : 'scale(1)',
        flexShrink: 0,
      }}
    />
  );
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const imgUrl = getImageUrl(product.imageUrl);
  const colors = (product.colors as string[] | null) || [];
  const details = (product.details as string[] | null) || [];

  return (
    <div
      id={`product-card-${product.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-surface-2)',
        border: `1px solid ${hovered ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => onAddToCart(product)}
    >
      {/* Imagem do produto */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: 'var(--color-surface-3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <Package size={48} color="var(--color-text-3)" />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Sem foto</span>
          </div>
        )}
        {/* Badge de adicionar */}
        {hovered && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'var(--color-primary)',
            borderRadius: 999,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
            boxShadow: '0 4px 12px rgba(59,130,246,0.5)',
            animation: 'fadeInUp 0.15s ease',
          }}>
            <Plus size={14} /> Adicionar
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-1)', margin: 0, lineHeight: 1.3 }}>
          {product.name}
        </h3>
        {product.description && (
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </p>
        )}

        {colors.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {colors.slice(0, 6).map((c: string) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
            ))}
            {colors.length > 6 && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>+{colors.length - 6}</span>}
          </div>
        )}

        {details.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {details.slice(0, 2).map((d: string) => (
              <span key={d} style={{ fontSize: 11, background: 'var(--color-surface-3)', padding: '2px 8px', borderRadius: 6, color: 'var(--color-text-3)' }}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PublicCatalogPage() {
  const { token } = useParams<{ token: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [companyWhatsapp, setCompanyWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>('catalog');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [borderType, setBorderType] = useState<BorderType>(null);
  const [customization, setCustomization] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ orderNumber: string; whatsapp: string } | null>(null);

  // Formulário
  const [form, setForm] = useState({
    clientName: '',
    clientCpfCnpj: '',
    clientWhatsapp: '',
    deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // Empresa decide, colocamos 15 dias como default para o DB
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);

  // Carregar catálogo
  useEffect(() => {
    if (!token) return;
    api.get(`/public/catalog/${token}`)
      .then(res => {
        setProducts(res.data.products);
        setCompanyWhatsapp(res.data.companyWhatsapp);
        setLoading(false);
      })
      .catch(() => {
        setTokenInvalid(true);
        setLoading(false);
      });
  }, [token]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Abrir modal de produto
  function openProduct(product: Product) {
    setSelectedProduct(product);
    const colors = (product.colors as string[] | null) || [];
    setSelectedColor(colors.length > 0 ? colors[0] : null);
    setBorderType(null);
    setCustomization('');
    setQuantity(1);
  }

  // Adicionar ao carrinho
  function addToCart() {
    if (!selectedProduct) return;
    if (!borderType) {
      alert('Por favor, selecione o tipo de borda.');
      return;
    }
    setCart(prev => {
      const key = `${selectedProduct.id}-${selectedColor}-${borderType}-${customization}`;
      const existing = prev.find(i => `${i.productId}-${i.selectedColor}-${i.borderType}-${i.customization}` === key);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        customization,
        selectedColor,
        borderType,
      }];
    });
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  function changeQty(idx: number, delta: number) {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  }

  // Validação do formulário
  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.clientName.trim()) errors.clientName = 'Nome é obrigatório';
    const cpfCnpjDigits = form.clientCpfCnpj.replace(/\D/g, '');
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      errors.clientCpfCnpj = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido';
    }
    const phoneDigits = form.clientWhatsapp.replace(/\D/g, '');
    if (phoneDigits.length < 10) errors.clientWhatsapp = 'WhatsApp inválido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Enviar pedido
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/public/catalog/${token}/request`, {
        ...form,
        items: cart.map(i => {
          const rest = i.customization
            ? `${i.selectedColor ? `Cor: ${i.selectedColor} | ` : ''}${i.customization}`
            : i.selectedColor ? `Cor: ${i.selectedColor}` : '';
          return {
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            customization: buildCustomization(i.borderType, rest),
          };
        }),
      });
      setSuccessData({ orderNumber: res.data.orderNumber, whatsapp: res.data.companyWhatsapp || companyWhatsapp });
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao enviar pedido. Tente novamente.';
      setFormErrors({ _global: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0c10' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={40} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  // ── Token inválido ──
  if (tokenInvalid) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0c10 0%, #0f1623 100%)',
        fontFamily: 'Inter, sans-serif',
        flexDirection: 'column', gap: 24, textAlign: 'center', padding: '0 24px',
      }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(239,68,68,0.2)' }}>
          <Lock size={36} color="#ef4444" />
        </div>
        <h1 style={{ color: '#f8fafc', fontSize: 28, fontWeight: 800, margin: 0 }}>Acesso não autorizado</h1>
        <p style={{ color: '#94a3b8', maxWidth: 360, lineHeight: 1.6 }}>
          Este link de catálogo é inválido ou expirou. Entre em contato com a <strong style={{ color: '#f8fafc' }}>Toque Ideal</strong> para obter um novo link de acesso.
        </p>
        {companyWhatsapp && (
          <a
            href={`https://wa.me/${companyWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#25d366', color: 'white', padding: '12px 24px',
              borderRadius: 12, fontWeight: 700, textDecoration: 'none',
              fontSize: 15,
            }}
          >
            <MessageCircle size={18} /> Falar com a Toque Ideal
          </a>
        )}
      </div>
    );
  }

  // ── Sucesso ──
  if (step === 'success' && successData) {
    const waMsg = encodeURIComponent(
      `Olá! Acabei de enviar um pedido pelo catálogo online. Número: ${successData.orderNumber}. Aguardo a confirmação!`
    );
    const waUrl = `https://wa.me/${successData.whatsapp}?text=${waMsg}`;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0c10 0%, #0f1623 100%)',
        fontFamily: 'Inter, sans-serif', padding: '24px',
      }}>
        <div style={{
          background: '#12151c', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: '48px 40px', maxWidth: 520, width: '100%',
          textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', border: '2px solid rgba(16,185,129,0.3)',
          }}>
            <CheckCircle2 size={40} color="#10b981" />
          </div>

          <h1 style={{ color: '#f8fafc', fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>
            Pedido enviado! 🎉
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
            Sua solicitação foi recebida com sucesso. Nossa equipe entrará em contato para confirmar os detalhes.
          </p>

          <div style={{
            background: '#1a1f29', borderRadius: 14, padding: '20px 24px',
            marginBottom: 28, border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Número do pedido
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', fontFamily: 'Space Grotesk, sans-serif' }}>
              #{successData.orderNumber}
            </p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Guarde este número para acompanhamento
            </p>
          </div>

          {successData.whatsapp && (
            <a
              id="whatsapp-confirm-btn"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#25d366', color: 'white', padding: '14px 28px',
                borderRadius: 14, fontWeight: 700, textDecoration: 'none', fontSize: 15,
                marginBottom: 14, transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              <MessageCircle size={20} />
              Confirmar via WhatsApp
            </a>
          )}

          <button
            id="new-order-btn"
            onClick={() => { setCart([]); setStep('catalog'); setSuccessData(null); setForm({ clientName: '', clientCpfCnpj: '', clientWhatsapp: '', deliveryDate: '', notes: '' }); }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', padding: '12px 24px', borderRadius: 12,
              cursor: 'pointer', width: '100%', fontWeight: 600, fontSize: 14,
            }}
          >
            Fazer outro pedido
          </button>
        </div>
      </div>
    );
  }

  // ── Catálogo + Carrinho + Formulário ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', fontFamily: 'Inter, sans-serif' }}>
      {/* CSS extras inline */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
        .catalog-input {
          background: #1a1f29;
          border: 1px solid rgba(255,255,255,0.08);
          color: #f8fafc;
          padding: 12px 16px;
          border-radius: 12px;
          width: 100%;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s;
          outline: none;
        }
        .catalog-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        .catalog-input.error {
          border-color: #ef4444;
        }
        .catalog-input::placeholder { color: #475569; }
        textarea.catalog-input { resize: vertical; min-height: 80px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #242b38; border-radius: 4px; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,12,16,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Toque Ideal" style={{ height: 36, width: 'auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: '#f8fafc' }}>Catálogo</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Toque Ideal</div>
          </div>
        </div>

        <button
          id="cart-btn"
          onClick={() => setCartOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: cartCount > 0 ? '#3b82f6' : '#1a1f29',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', padding: '8px 16px', borderRadius: 10,
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
            transition: 'all 0.2s ease',
            boxShadow: cartCount > 0 ? '0 4px 14px rgba(59,130,246,0.4)' : 'none',
          }}
        >
          <ShoppingCart size={18} />
          {cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho'}
          {cartCount > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.25)', borderRadius: 999,
              padding: '1px 7px', fontSize: 12, fontWeight: 800,
            }}>{cartCount}</span>
          )}
        </button>
      </header>

      {/* ── HERO ── */}
      <div style={{
        textAlign: 'center', padding: '48px 24px 32px',
        background: 'linear-gradient(180deg, rgba(59,130,246,0.07) 0%, transparent 100%)',
      }}>
        <h1 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 800,
          color: '#f8fafc', margin: '0 0 12px',
          background: 'linear-gradient(135deg, #f8fafc 40%, #3b82f6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Nosso Catálogo
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 480, margin: '0 auto 28px' }}>
          Escolha seus produtos, personalize e envie sua solicitação. Nossa equipe entrará em contato para confirmar.
        </p>

        {/* Barra de busca */}
        <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            id="catalog-search"
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="catalog-input"
            style={{ paddingLeft: 40, background: '#12151c' }}
          />
        </div>
      </div>

      {/* ── GRADE DE PRODUTOS ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <Package size={56} color="#334155" style={{ marginBottom: 16 }} />
            <p style={{ color: '#64748b', fontSize: 16 }}>
              {search ? 'Nenhum produto encontrado para sua busca.' : 'Nenhum produto disponível no catálogo.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 20,
          }}>
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={openProduct} />
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL DE PRODUTO ── */}
      {selectedProduct && (
        <div
          id="product-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '24px 16px',
          }}
        >
          <div style={{
            background: '#12151c', borderRadius: 24, width: '100%', maxWidth: 540,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
            animation: 'slideInUp 0.2s ease',
            maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
          }}>
            {/* Imagem */}
            {getImageUrl(selectedProduct.imageUrl) ? (
              <img
                src={getImageUrl(selectedProduct.imageUrl)!}
                alt={selectedProduct.name}
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '24px 24px 0 0' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#1a1f29', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={64} color="#334155" />
              </div>
            )}

            <div style={{ padding: '24px 24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {selectedProduct.name}
                </h2>
                <button id="close-product-modal" onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                  <X size={22} />
                </button>
              </div>

              {selectedProduct.description && (
                <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{selectedProduct.description}</p>
              )}

              {/* Detalhes */}
              {((selectedProduct.details as string[] | null) || []).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Características</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {((selectedProduct.details as string[]) || []).map((d: string) => (
                      <span key={d} style={{ fontSize: 12, background: '#1a1f29', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 8, color: '#94a3b8' }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cores */}
              {((selectedProduct.colors as string[] | null) || []).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Cor {selectedColor && <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8', letterSpacing: 0 }}>— {selectedColor}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {((selectedProduct.colors as string[]) || []).map((c: string) => (
                      <ColorSwatch key={c} color={c} selected={selectedColor === c} onClick={() => setSelectedColor(c)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de Borda */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Tipo de Borda *
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setBorderType('SEM_BORDA')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                      background: borderType === 'SEM_BORDA' ? 'rgba(59,130,246,0.1)' : '#1a1f29',
                      color: borderType === 'SEM_BORDA' ? '#3b82f6' : '#94a3b8',
                      border: borderType === 'SEM_BORDA' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    ⬜ Sem Borda
                  </button>
                  <button
                    onClick={() => setBorderType('COM_BORDA')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                      background: borderType === 'COM_BORDA' ? 'rgba(245,158,11,0.1)' : '#1a1f29',
                      color: borderType === 'COM_BORDA' ? '#f59e0b' : '#94a3b8',
                      border: borderType === 'COM_BORDA' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    🔲 Com Borda
                  </button>
                </div>
              </div>

              {/* Personalização */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                  Personalização (opcional)
                </label>
                <textarea
                  id="customization-input"
                  className="catalog-input"
                  placeholder="Ex: medidas específicas, gravação, detalhes especiais..."
                  value={customization}
                  onChange={e => setCustomization(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Quantidade */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Quantidade</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button id="qty-minus" onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1f29', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={16} />
                  </button>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', minWidth: 32, textAlign: 'center' }}>{quantity}</span>
                  <button id="qty-plus" onClick={() => setQuantity(q => q + 1)} style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1f29', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                id="add-to-cart-btn"
                onClick={addToCart}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: '#3b82f6', border: 'none', color: 'white',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.transform = 'none'; }}
              >
                <ShoppingBag size={18} /> Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DO CARRINHO ── */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '100%', maxWidth: 440,
            background: '#12151c', borderLeft: '1px solid rgba(255,255,255,0.08)',
            zIndex: 400, display: 'flex', flexDirection: 'column',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
            animation: 'slideInRight 0.25s ease',
          }}>
            {/* Header do carrinho */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={20} color="#3b82f6" />
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Meu Carrinho
                </h2>
                {cartCount > 0 && (
                  <span style={{ background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{cartCount}</span>
                )}
              </div>
              <button id="close-cart-btn" onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            {/* Itens */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 60 }}>
                  <ShoppingBag size={48} color="#334155" style={{ marginBottom: 16 }} />
                  <p style={{ color: '#475569', fontSize: 15 }}>Seu carrinho está vazio</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{ marginTop: 16, background: 'none', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Ver produtos
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{
                      background: '#1a1f29', borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14, margin: '0 0 4px' }}>{item.productName}</p>
                          {item.selectedColor && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.selectedColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <span style={{ fontSize: 12, color: '#64748b' }}>{item.selectedColor}</span>
                            </div>
                          )}
                          {item.borderType && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {item.borderType === 'COM_BORDA' ? '🔲 Com Borda' : '⬜ Sem Borda'}
                            </div>
                          )}
                          {item.customization && (
                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>"{item.customization}"</p>
                          )}
                        </div>
                        <button
                          id={`remove-cart-item-${idx}`}
                          onClick={() => removeFromCart(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', opacity: 0.7 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          id={`cart-minus-${idx}`}
                          onClick={() => changeQty(idx, -1)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#242b38', border: 'none', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button
                          id={`cart-plus-${idx}`}
                          onClick={() => changeQty(idx, 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#242b38', border: 'none', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={14} />
                        </button>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                          {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do carrinho */}
            {cart.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>Total de itens</span>
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>{cartCount} {cartCount === 1 ? 'peça' : 'peças'}</span>
                </div>
                <button
                  id="proceed-to-form-btn"
                  onClick={() => { setCartOpen(false); setStep('form'); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14,
                    background: '#3b82f6', border: 'none', color: 'white',
                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                  }}
                >
                  Finalizar solicitação <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FORMULÁRIO DE CONTATO (step === form) ── */}
      {step === 'form' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
          overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px 16px',
        }}>
          <div ref={formRef} style={{
            background: '#12151c', borderRadius: 24, width: '100%', maxWidth: 560,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
            animation: 'slideInUp 0.25s ease',
            marginBottom: 24,
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: '0 0 2px' }}>
                  Dados para Contato
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  {cart.length} {cart.length === 1 ? 'produto' : 'produtos'} • {cartCount} {cartCount === 1 ? 'peça' : 'peças'} no total
                </p>
              </div>
              <button
                id="back-to-catalog-btn"
                onClick={() => { setStep('catalog'); setCartOpen(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Resumo do carrinho */}
            <div style={{ padding: '16px 24px', background: '#0f1320', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumo do pedido</p>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {item.quantity}x {item.productName}
                    {item.selectedColor && <span style={{ color: '#475569' }}> ({item.selectedColor})</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {formErrors._global && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 14 }}>
                  <AlertCircle size={16} /> {formErrors._global}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Nome */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <User size={12} /> Nome completo *
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    className={`catalog-input ${formErrors.clientName ? 'error' : ''}`}
                    placeholder="Seu nome ou razão social"
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                    autoComplete="name"
                  />
                  {formErrors.clientName && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formErrors.clientName}</p>}
                </div>

                {/* CPF/CNPJ */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <FileText size={12} /> CPF / CNPJ *
                  </label>
                  <input
                    id="form-cpf-cnpj"
                    type="text"
                    className={`catalog-input ${formErrors.clientCpfCnpj ? 'error' : ''}`}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={form.clientCpfCnpj}
                    onChange={e => setForm(f => ({ ...f, clientCpfCnpj: formatCpfCnpj(e.target.value) }))}
                    maxLength={18}
                    inputMode="numeric"
                  />
                  {formErrors.clientCpfCnpj && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formErrors.clientCpfCnpj}</p>}
                </div>

                {/* WhatsApp */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Phone size={12} /> WhatsApp *
                  </label>
                  <input
                    id="form-whatsapp"
                    type="tel"
                    className={`catalog-input ${formErrors.clientWhatsapp ? 'error' : ''}`}
                    placeholder="(00) 00000-0000"
                    value={form.clientWhatsapp}
                    onChange={e => setForm(f => ({ ...f, clientWhatsapp: formatPhone(e.target.value) }))}
                    inputMode="tel"
                    maxLength={15}
                  />
                  {formErrors.clientWhatsapp && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{formErrors.clientWhatsapp}</p>}
                </div>


                {/* Observações */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <FileText size={12} /> Observações (opcional)
                  </label>
                  <textarea
                    id="form-notes"
                    className="catalog-input"
                    placeholder="Informações adicionais, endereço de entrega, etc."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, display: 'flex', gap: 6 }}>
                  <Lock size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  Seus dados são utilizados apenas para contato e confirmação do pedido pela Toque Ideal.
                </p>

                <button
                  id="submit-order-btn"
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 14,
                    background: submitting ? '#1e3a5f' : '#3b82f6',
                    border: 'none', color: 'white', fontWeight: 700,
                    fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(59,130,246,0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  {submitting ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  ) : (
                    <><CheckCircle2 size={18} /> Enviar Solicitação</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
