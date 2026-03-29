import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Clock, Package, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { Alert, AlertType, AlertSeverity } from '../types';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

const ALERT_COLORS: Record<AlertSeverity, string> = {
  INFO: 'var(--color-info)',
  WARNING: 'var(--color-warning)',
  CRITICAL: 'var(--color-danger)',
};

const ALERT_ICONS: Record<AlertType, React.ReactNode> = {
  DEADLINE_APPROACHING: <Clock size={16} />,
  STEP_DELAYED: <AlertTriangle size={16} />,
  LOW_STOCK: <Package size={16} />,
  ORDER_DELAYED: <XCircle size={16} />,
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  DEADLINE_APPROACHING: 'Prazo se aproximando',
  STEP_DELAYED: 'Etapa atrasada',
  LOW_STOCK: 'Estoque baixo',
  ORDER_DELAYED: 'Pedido atrasado',
};

export default function AlertsPage({ onMarkRead }: { onMarkRead: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const { subscribe } = useSocket();

  const fetchAlerts = async () => {
    const params = filter === 'unread' ? { isRead: false } : {};
    const res = await api.get<Alert[]>('/alerts', { params });
    setAlerts(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  useEffect(() => {
    const u = subscribe('alert:new', fetchAlerts);
    return u;
  }, [subscribe, fetchAlerts]);

  const markRead = async (id: string) => {
    await api.put(`/alerts/${id}/read`);
    fetchAlerts();
  };

  const markAllRead = async () => {
    await api.put('/alerts/read-all');
    toast.success('Todos os alertas marcados como lidos');
    onMarkRead();
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await api.delete(`/alerts/${id}`);
    fetchAlerts();
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} alertas não lidos` : 'Todos os alertas lidos'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={markAllRead}>
            <CheckCheck size={15} /> Marcar todos como lidos
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['unread', 'all'] as const).map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'unread' ? '🔴 Não lidos' : '📋 Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-3)' }}>
            Carregando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <p style={{ fontWeight: 600 }}>Nenhum alerta {filter === 'unread' ? 'não lido' : ''}</p>
            <p style={{ fontSize: 13 }}>
              {filter === 'unread' ? 'Todos os alertas estão lidos!' : 'Sem alertas no momento'}
            </p>
          </div>
        ) : (
          alerts.map(alert => {
            const color = ALERT_COLORS[alert.severity];
            return (
              <div
                key={alert.id}
                className={`alert-item ${!alert.isRead ? 'unread' : ''}`}
                style={{ '--alert-color': color } as React.CSSProperties}
                onClick={() => !alert.isRead && markRead(alert.id)}
              >
                {!alert.isRead && <div className="alert-dot" style={{ '--alert-color': color } as React.CSSProperties} />}
                
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${color}18`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {ALERT_ICONS[alert.type]}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: `${color}18`,
                      color,
                      textTransform: 'uppercase',
                    }}>
                      {ALERT_TYPE_LABELS[alert.type]}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: `${color}18`,
                      color,
                      marginLeft: 'auto',
                    }}>
                      {alert.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                    {formatDistanceToNow(new Date(alert.createdAt), { locale: ptBR, addSuffix: true })}
                    {alert.order && ` • ${alert.order.orderNumber} - ${alert.order.client.name}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!alert.isRead && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Marcar como lido"
                      onClick={e => { e.stopPropagation(); markRead(alert.id); }}
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Remover"
                    onClick={e => { e.stopPropagation(); deleteAlert(alert.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
