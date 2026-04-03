export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  _count?: { orders: number };
  createdAt?: string;
}

export type OrderStatus = 'PENDING' | 'IN_PRODUCTION' | 'FINISHED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  client: Client;
  deliveryDate: string;
  notes?: string;
  status: OrderStatus;
  items: OrderItem[];
  alerts?: Alert[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  customization?: string;
  quantity: number;
  status: string;
  isPicked: boolean;
  productionSteps: ProductionStep[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
}

export type StepName = 'CUTTING' | 'MOLDING' | 'PAINTING' | 'FINISHING' | 'GLOSS' | 'CLEANING' | 'PACKAGING';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ProductionStep {
  id: string;
  orderItemId: string;
  item: OrderItem & { order: Order & { client: Client } };
  stepName: StepName;
  stepOrder: number;
  status: StepStatus;
  estimatedMinutes: number;
  startedAt?: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
}

export type UnitType = 'KG' | 'LITERS' | 'UNITS' | 'METERS' | 'SHEETS';
export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

export interface StockMaterial {
  id: string;
  name: string;
  unit: UnitType;
  currentStock: number;
  minimumStock: number;
}

export type AlertType = 'DEADLINE_APPROACHING' | 'STEP_DELAYED' | 'LOW_STOCK' | 'ORDER_DELAYED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  orders: {
    total: number;
    pending: number;
    inProduction: number;
    finished: number;
    delivered: number;
    cancelled: number;
  };
  delayedOrders: any[];
  upcomingOrders: any[];
  delayedSteps: any[];
  stepCounts: any[];
  avgTimeByStep: any[];
  unreadAlerts: number;
  lowStockCount?: number;
  itemStock?: {
    pending: number;
    production: number;
    packaged: number;
  };
  aggregatedQueue?: {
    sector: string;
    items: { name: string; qty: number }[];
  }[];
}

export const STEP_LABELS: Record<string, string> = {
  CUTTING: 'Corte',
  MOLDING: 'Molde / Forno',
  PAINTING: 'Pintura',
  FINISHING: 'Acabamento',
  GLOSS: 'Brilho',
  CLEANING: 'Limpeza',
  PACKAGING: 'Embalagem',
};

export const STEP_COLORS: Record<string, string> = {
  CUTTING: '#10b981',
  MOLDING: '#f59e0b',
  PAINTING: '#3b82f6',
  FINISHING: '#8b5cf6',
  GLOSS: '#f43f5e',
  CLEANING: '#06b6d4',
  PACKAGING: '#64748b',
};

export const STEP_EMOJIS: Record<string, string> = {
  CUTTING: '✂️',
  MOLDING: '🔥',
  PAINTING: '🎨',
  FINISHING: '✨',
  GLOSS: '💎',
  CLEANING: '🧼',
  PACKAGING: '📦',
};


export const UNIT_LABELS: Record<string, string> = {
  KG: 'Quilos',
  LITERS: 'Litros',
  UNITS: 'Unidades',
  METERS: 'Metros',
  SHEETS: 'Chapas',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PRODUCTION: 'Em Produção',
  FINISHED: 'Finalizado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const STEP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em Execução',
  COMPLETED: 'Concluído',
  BLOCKED: 'Bloqueado',
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  DEADLINE_APPROACHING: 'Prazo Próximo',
  STEP_DELAYED: 'Etapa Atrasada',
  LOW_STOCK: 'Estoque Baixo',
  ORDER_DELAYED: 'Pedido Atrasado',
};

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  INFO: 'Informação',
  WARNING: 'Aviso',
  CRITICAL: 'Crítico',
};
