import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Zap, 
  ClipboardList,
  Share2,
  Gauge,
  Activity,
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Order } from '../types';
import { STEP_LABELS, STEP_COLORS } from '../types';

interface DashboardData {
  orders: {
    total: number;
    pending: number;
    inProduction: number;
    finished: number;
    delivered: number;
    cancelled: number;
  };
  itemStock: {
    pending: number;
    production: number;
    packaged: number;
  };
  delayedOrders: any[];
  upcomingOrders: any[];
  delayedSteps: any[];
  stepCounts: { stepName: string; status: string; _count: { id: number } }[];
  avgTimeByStep: { 
    stepName: string; 
    avgMinutes: number; 
    avgEstimated: number; 
    efficiency: number; 
    completedCount: number 
  }[];
  lowStockCount: number;
  unreadAlerts: number;
  aggregatedQueue: {
    sector: string;
    items: { name: string; qty: number }[];
  }[];
}

function StatCard({ icon, label, value, accent, sub }: { icon: any, label: string, value: number, accent: string, sub?: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color-alpha': `${accent}20`, borderLeft: `4px solid ${accent}` } as any}>
      <div style={{ color: accent, background: `${accent}15`, width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = async () => {
    const res = await api.get<DashboardData>('/dashboard');
    setData(res.data);
  };

  const handleShareTracking = (order: Order) => {
    const trackingUrl = `${window.location.origin}/tracking/${order.id}`;
    const message = `Olá! Acompanhe o progresso do seu pedido na Toque Ideal através deste link: ${trackingUrl}`;
    
    navigator.clipboard.writeText(message).then(() => {
      toast.success('Link de rastreio copiado!');
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando métricas da fábrica...</div>;

  // Cálculo de Gargalo Crítico
  const bottleneck = data.avgTimeByStep
    .map(step => {
      const queueCount = data.stepCounts.find(s => s.stepName === step.stepName && ['IN_PROGRESS', 'PENDING'].includes(s.status))?._count.id || 0;
      const workloadIndex = queueCount * step.avgMinutes;
      return { ...step, queueCount, workloadIndex };
    })
    .sort((a, b) => b.workloadIndex - a.workloadIndex)[0];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Painel de Performance</h1>
          <p className="page-subtitle">Diagnóstico em tempo real da produtividade e gargalos</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard
          icon={<ClipboardList size={22} />}
          label="Total de Peças"
          value={data.orders.total}
          accent="var(--color-info)"
          sub="histórico geral"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Backlog"
          value={data.itemStock?.pending || 0}
          accent="var(--color-warning)"
          sub="aguardando"
        />
        <StatCard
          icon={<Activity size={22} />}
          label="Eficiência Média"
          value={Math.round(data.avgTimeByStep.reduce((acc, i) => acc + i.efficiency, 0) / (data.avgTimeByStep.length || 1))}
          accent="#10b981"
          sub="fábrica vs estimado (%)"
        />
        <StatCard
          icon={<Zap size={22} />}
          label="Em Fluxo"
          value={data.orders.inProduction + data.orders.pending}
          accent="var(--color-warning)"
          sub="ativos agora"
        />
        <StatCard
          icon={<CheckCircle size={22} />}
          label="Prontas"
          value={data.orders.finished}
          accent="var(--color-success)"
          sub="finalizadas"
        />
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* DIAGNÓSTICO DE GARGALOS */}
        <div className="card shadow-premium" style={{ borderTop: '4px solid #ef4444' }}>
          <div className="flex items-center gap-2 mb-6">
            <Gauge size={20} style={{ color: '#ef4444' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Diagnóstico de Gargalos</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {data.avgTimeByStep.length > 0 ? data.avgTimeByStep.map(step => {
              const queueCount = data.stepCounts.find(s => s.stepName === step.stepName && ['IN_PROGRESS', 'PENDING'].includes(s.status))?._count.id || 0;
              const isBottleneck = bottleneck?.stepName === step.stepName && queueCount > 0;
              
              return (
                <div key={step.stepName} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontSize: 13, fontWeight: 700 }}>{STEP_LABELS[step.stepName] || step.stepName}</span>
                       {isBottleneck && <span style={{ fontSize: 9, background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: 4, fontWeight: 900 }}>GARGALO CRÍTICO</span>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: step.efficiency < 85 ? '#ef4444' : '#10b981' }}>
                      {step.efficiency}% Eficiência
                    </div>
                  </div>
                  <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(step.efficiency, 100)}%`, 
                        background: step.efficiency < 85 ? '#ef4444' : '#10b981',
                        transition: 'width 1s ease-in-out'
                      }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>
                    <span>Tempo Médio: {step.avgMinutes} min</span>
                    <span>Estimado: {step.avgEstimated} min</span>
                    <span style={{ color: 'var(--color-text-1)' }}>{queueCount} peças na fila</span>
                  </div>
                </div>
              );
            }) : <div style={{ textAlign: 'center', opacity: 0.3, padding: 40 }}>Aguardando conclusão de peças para análise...</div>}
          </div>

          {bottleneck && bottleneck.queueCount > 0 && (
             <div style={{ marginTop: 24, padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  💡 Insight de Produção
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                  O setor de <strong>{STEP_LABELS[bottleneck.stepName] || bottleneck.stepName}</strong> está retendo o fluxo da fábrica. 
                  Com {bottleneck.queueCount} peças acumuladas e eficiência abaixo do esperado, este é o ponto ideal para reforço de equipe hoje.
                </p>
             </div>
          )}
        </div>

        {/* PROXIMAS ENTREGAS */}
        <div className="card shadow-premium">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={19} style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Próximas Entregas Críticas</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.upcomingOrders.length > 0 ? data.upcomingOrders.map((order: any) => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>ORD {order.orderNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{order.client.name}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--color-warning)' }}>
                      {new Date(order.deliveryDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Limiar</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', padding: 8, background: 'rgba(255,255,255,0.05)' }} onClick={() => handleShareTracking(order)}>
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)', fontSize: 12, textAlign: 'center', padding: 40 }}>Sem entregas críticas para os próximos dias.</p>}
          </div>
        </div>
      </div>

      {/* FILA ATIVA */}
      <div className="card shadow-premium mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Radar de Carga por Setor</h3>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>Carga atual de peças em fluxo</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {(data.aggregatedQueue || []).map((q: any) => {
            const totalQty = q.items.reduce((acc: number, i: any) => acc + i.qty, 0);
            return (
              <div key={q.sector} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: 16, 
                padding: 16, 
                border: '1px solid var(--color-border)',
                borderTop: `6px solid ${STEP_COLORS[q.sector] || 'var(--color-primary)'}` 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{STEP_LABELS[q.sector] || q.sector}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-primary)' }}>{totalQty}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {q.items.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-2)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 700 }}>{item.qty} un</span>
                    </div>
                  ))}
                  {q.items.length > 3 && <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>+ {q.items.length - 3} modelos...</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
