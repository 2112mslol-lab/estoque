import { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import type { Alert, AlertType, AlertSeverity } from '../types';

export default function AlertsPage({ onMarkRead }: { onMarkRead?: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { subscribe } = useSocket();

  const fetchAlerts = async () => {
    const res = await api.get<Alert[]>('/alerts');
    setAlerts(res.data);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('alert:new', fetchAlerts);
    return () => { unsubscribe(); };
  }, [subscribe]);

  const markAsRead = async (id: string) => {
    await api.put(`/alerts/${id}/read`);
    fetchAlerts();
    if (onMarkRead) onMarkRead();
  };

  const getAlertIcon = (type: AlertType, severity: AlertSeverity) => {
    const color = severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)';
    switch (type) {
      case 'DEADLINE_APPROACHING': return <Clock size={20} style={{ color }} />;
      case 'STEP_DELAYED': return <AlertTriangle size={20} style={{ color }} />;
      default: return <AlertCircle size={20} style={{ color }} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Status e Alertas</h1>
          <p className="page-subtitle">Monitoramento de prazos e gargalos</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}> Tudo em ordem na fábrica! 🏭</div>
        ) : alerts.map(alert => (
          <div key={alert.id} className="card" style={{ 
            opacity: alert.isRead ? 0.6 : 1,
            borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {getAlertIcon(alert.type, alert.severity)}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{alert.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{alert.message}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                  {format(new Date(alert.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
            {!alert.isRead && (
              <button className="btn btn-ghost btn-sm" onClick={() => markAsRead(alert.id)}>
                <Check size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
