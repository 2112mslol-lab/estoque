import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Zap, 
  ClipboardList 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api';
import type { DashboardData, Order } from '../types';
import { STEP_LABELS, STEP_COLORS } from '../types';

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

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando métricas da fábrica...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão Geral</h1>
          <p className="page-subtitle">Monitoramento em tempo real da Toque Ideal</p>
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
          icon={<Zap size={22} />}
          label="Em Produção"
          value={data.orders.inProduction + data.orders.pending}
          accent="var(--color-warning)"
          sub="fluxo ativo"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Atrasos"
          value={data.delayedSteps.length}
          accent="var(--color-danger)"
          sub="precisa atenção"
        />
        <StatCard
          icon={<CheckCircle size={22} />}
          label="Finalizadas"
          value={data.orders.finished}
          accent="var(--color-success)"
          sub="pronto p/ entrega"
        />
      </div>

      <div className="grid-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Distribuição por Setor (Qtd)</h3>
          </div>
          {data.stepCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.stepCounts.filter(s => s.status === 'IN_PROGRESS').map(s => ({
                name: STEP_LABELS[s.stepName] || s.stepName,
                quantidade: s._count.id,
                color: STEP_COLORS[s.stepName] || '#333'
              }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12 }}
                />
                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                  {data.stepCounts.filter(s => s.status === 'IN_PROGRESS').map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STEP_COLORS[entry.stepName] || '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
              Nenhuma peça em produção agora
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Entregas Próximas</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.upcomingOrders.length > 0 ? data.upcomingOrders.map((order: Order) => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{order.orderNumber} - {order.client.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{order.items?.length || 0} peças no pedido</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}>
                    {new Date(order.deliveryDate).toLocaleDateString('pt-BR')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>prazo limite</div>
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)', fontSize: 12 }}>Nenhuma entrega para os próximos dias.</p>}
          </div>
        </div>
      </div>
      {data.itemStock && (
        <div className="card mb-6 shadow-premium" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Estoque de Produção (Qtd. de Peças)</h3>
            </div>
            <a href="/stock-items" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>Ver Detalhado →</a>
          </div>
          
          <div className="grid-3 gap-4">
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--color-warning)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🕒 Pendente
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{data.itemStock.pending}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                ⚙️ Em Produção
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{data.itemStock.production}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                📦 Embalado
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{data.itemStock.packaged}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <ClipboardList size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Fila Global de Produção (O que produzir hoje)</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {(data.aggregatedQueue || []).map((q: any) => (
            <div key={q.sector} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, borderTop: `4px solid ${STEP_COLORS[q.sector] || 'var(--color-border)'}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {STEP_LABELS[q.sector] || q.sector}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-1)' }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>{item.qty}x</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(!data.aggregatedQueue || data.aggregatedQueue.length === 0) && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>
              Fila de produção vazia no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
