import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Package, TrendingUp, ShoppingBag, CheckCircle, Truck, XCircle, Zap, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DashboardData } from '../types';
import { STEP_LABELS, STEP_COLORS, ORDER_STATUS_LABELS } from '../types';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

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
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  const fetchData = () => {
    api.get<DashboardData>('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    // Atualiza a cada 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub1 = subscribe('order:created', fetchData);
    const unsub2 = subscribe('order:updated', fetchData);
    const unsub3 = subscribe('step:updated', fetchData);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe]);

  if (loading || !data) {
    return (
      <div>
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="loading-shimmer" style={{ height: 80 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dados para o gráfico de tempo médio por etapa
  const avgChartData = data.avgTimeByStep.map(item => ({
    name: STEP_LABELS[item.stepName as keyof typeof STEP_LABELS] || item.stepName,
    avgMin: item.avgMinutes,
    color: STEP_COLORS[item.stepName as keyof typeof STEP_COLORS] || '#3b82f6',
    completedCount: item.completedCount,
  }));

  // Dados para gráfico de pedidos por status
  const statusChartData = [
    { name: 'Pendente', value: data.orders.pending, color: '#f59e0b' },
    { name: 'Produção', value: data.orders.inProduction, color: '#3b82f6' },
    { name: 'Finalizado', value: data.orders.finished, color: '#22c55e' },
    { name: 'Entregue', value: data.orders.delivered, color: '#a855f7' },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Stats principais */}
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

      {/* Segunda linha de stats */}
      <div className="grid-4 mb-6">
        <StatCard icon={<Clock size={20} />} label="Pendentes" value={data.orders.pending} accent="#f59e0b" />
        <StatCard icon={<CheckCircle size={20} />} label="Finalizados" value={data.orders.finished} accent="#22c55e" />
        <StatCard icon={<Truck size={20} />} label="Entregues" value={data.orders.delivered} accent="#a855f7" />
        <StatCard icon={<XCircle size={20} />} label="Cancelados" value={data.orders.cancelled} accent="#ef4444" />
      </div>

      <div className="grid-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--color-primary-400)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Distribuição por Setor (Quantidade de Peças)</h3>
          </div>
          {data.stepCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.stepCounts.filter(s => s.status === 'IN_PROGRESS').map(s => ({
                name: STEP_LABELS[s.stepName as keyof typeof STEP_LABELS],
                quantidade: s._count.id,
                color: STEP_COLORS[s.stepName as keyof typeof STEP_COLORS]
              }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                />
                <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                  {data.stepCounts.filter(s => s.status === 'IN_PROGRESS').map((entry, index) => (
                    <Cell key={index} fill={STEP_COLORS[entry.stepName as keyof typeof STEP_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏭</div>
              <p>Nenhuma peça em produção agora</p>
            </div>
          )}
        </div>

        {/* Gráfico: Pedidos por status */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={18} style={{ color: 'var(--color-primary-400)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pedidos por Status</h3>
          </div>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>Nenhum pedido ainda</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 gap-4">
        {/* Pedidos atrasados */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pedidos Atrasados</h3>
            {data.delayedOrders.length > 0 && (
              <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', marginLeft: 'auto' }}>
                {data.delayedOrders.length}
              </span>
            )}
          </div>

          {data.delayedOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <p>Nenhum pedido atrasado!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.delayedOrders.slice(0, 5).map(order => (
                <div key={order.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--color-danger-bg)',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{order.client.name} • {order.product}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)' }}>
                    {formatDistanceToNow(new Date(order.deliveryDate), { locale: ptBR, addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos do prazo */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Próximos do Prazo</h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 'auto' }}>próx. 3 dias</span>
          </div>

          {data.upcomingOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p>Nenhum prazo crítico nas próximas 72h</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.upcomingOrders.map(order => (
                <div key={order.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--color-warning-bg)',
                  borderRadius: 8,
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{order.client.name}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)' }}>
                    {format(new Date(order.deliveryDate), "dd/MM HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
