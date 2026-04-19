import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Package, Calendar, User, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface TrackingData {
  orderNumber: string;
  clientName: string;
  status: string;
  deliveryDate: string;
  items: {
    productName: string;
    quantity: number;
    status: string;
    steps: {
      stepName: string;
      status: string;
      completedAt: string | null;
    }[];
  }[];
}

const statusMap: any = {
  'PENDING': { label: 'Pendente', color: '#ff9800' },
  'IN_PRODUCTION': { label: 'Em Produção', color: '#2196f3' },
  'FINISHED': { label: 'Finalizado', color: '#4caf50' },
  'DELIVERED': { label: 'Entregue', color: '#9c27b0' },
  'CANCELLED': { label: 'Cancelado', color: '#f44336' }
};

const stepNameMap: any = {
  'CUTTING': 'Corte',
  'MOLDING': 'Molde / Forno',
  'PAINTING': 'Pintura',
  'FINISHING': 'Acabamento',
  'GLOSS': 'Brilho',
  'CLEANING': 'Limpeza',
  'PACKAGING': 'Embalagem'
};

export default function PublicTrackingPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      api.get(`/public/orders/${id}`)
        .then(res => {
          setOrder(res.data);
          setLoading(false);
        })
        .catch(() => {
          setError('Pedido não encontrado ou link inválido.');
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: 'var(--color-bg)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: 20, textAlign: 'center', padding: 20 }}>
        <Package size={64} color="var(--color-text-3)" />
        <h1 style={{ color: 'var(--color-text-1)' }}>Ops!</h1>
        <p style={{ color: 'var(--color-text-2)' }}>{error}</p>
        <a href="/" className="btn btn-primary">Voltar ao Início</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '20px 10px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header - Identidade Visual */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 60, marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, color: 'var(--color-text-1)', fontWeight: 800 }}>Rastreio de Pedido</h1>
          <p style={{ color: 'var(--color-text-3)' }}>Acompanhe sua produção em tempo real</p>
        </div>

        {/* Card Principal de Resumo */}
        <div className="card" style={{ marginBottom: 24, borderTop: `4px solid ${statusMap[order.status]?.color || '#ccc'}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
                <Package size={24} color="var(--color-primary)" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Pedido</p>
                <p style={{ fontWeight: 700, fontSize: 18 }}>#{order.orderNumber}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
                <User size={24} color="var(--color-primary)" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Cliente</p>
                <p style={{ fontWeight: 700, fontSize: 18 }}>{order.clientName}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
                <Calendar size={24} color="var(--color-primary)" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Previsão</p>
                <p style={{ fontWeight: 700, fontSize: 18 }}>{new Date(order.deliveryDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ color: 'var(--color-text-2)' }}>Status Atual:</span>
             <span className="badge" style={{ 
               background: (statusMap[order.status]?.color || '#ccc') + '22', 
               color: statusMap[order.status]?.color,
               padding: '8px 16px',
               fontSize: 16,
               borderRadius: 99
             }}>
               {statusMap[order.status]?.label}
             </span>
          </div>
        </div>

        {/* Itens e Seus Passos de Produção */}
        <h3 style={{ margin: '32px 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <PlayCircle size={20} color="var(--color-primary)" /> 
          Itens em Produção
        </h3>

        {order.items.map((item, idx) => (
          <div key={idx} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h4 style={{ fontSize: 18, fontWeight: 700 }}>{item.productName}</h4>
              <span style={{ color: 'var(--color-text-3)' }}>Qtd: {item.quantity}</span>
            </div>

            {/* Timeline de Produção do Item */}
            <div style={{ position: 'relative', paddingLeft: 40 }}>
              {/* Linha Vertical de Conexão */}
              <div style={{ 
                position: 'absolute', 
                left: 14, 
                top: 10, 
                bottom: 10, 
                width: 2, 
                background: 'var(--color-border)' 
              }}></div>

              {item.steps.map((step, sIdx) => {
                const isCompleted = step.status === 'COMPLETED';
                const isCurrent = step.status === 'IN_PROGRESS';

                return (
                  <div key={sIdx} style={{ position: 'relative', marginBottom: 24, opacity: isCompleted || isCurrent ? 1 : 0.4 }}>
                    {/* Icone do Passo */}
                    <div style={{ 
                      position: 'absolute', 
                      left: -40, 
                      top: 0, 
                      width: 30, 
                      height: 30, 
                      borderRadius: '50%',
                      background: isCompleted ? '#4caf50' : isCurrent ? '#2196f3' : 'var(--color-surface-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                      boxShadow: isCurrent ? '0 0 15px rgba(33, 150, 243, 0.4)' : 'none'
                    }}>
                      {isCompleted ? <CheckCircle2 size={18} color="#fff" /> : <Clock size={16} color={isCurrent ? "#fff" : "var(--color-text-3)"} />}
                    </div>

                    <div>
                      <p style={{ 
                        fontWeight: isCurrent ? 700 : 500, 
                        color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-1)',
                        marginBottom: 4
                      }}>
                        {stepNameMap[step.stepName] || step.stepName}
                        {isCurrent && <span style={{ marginLeft: 8, fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-3)' }}>(Em andamento...)</span>}
                      </p>
                      {isCompleted && step.completedAt && (
                        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                          Concluído em: {new Date(step.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: 40, padding: '20px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1) 0%, rgba(0,0,0,0) 100%)' }}>
          <p style={{ color: 'var(--color-text-2)', marginBottom: 8 }}>Precisando de ajuda?</p>
          <a href="#" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Entre em contato com nossa central de atendimento
          </a>
        </div>

      </div>
    </div>
  );
}
