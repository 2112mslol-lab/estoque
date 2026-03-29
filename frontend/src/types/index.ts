export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
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
  productionSteps: ProductionStep[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
}

export type StepName = 'CUTTING' | 'MOLDING' | 'COOLING' | 'FINISHING' | 'PACKAGING';
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ProductionStep {
  id: string;
  orderItemId: string;
  item: OrderItem;
  stepName: StepName;
  stepOrder: number;
  status: StepStatus;
  estimatedMinutes: number;
  startedAt?: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
}

export interface StockMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
}
