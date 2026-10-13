export interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  address: string;
  plan_type: 'anual' | 'semestral' | 'vitalicio';
  plan_value: number;
  activation_date: string;
  expiration_date: string;
  status: 'ativo' | 'vencido' | 'cancelado';
  label_id: number | null;
  label_name?: string;
  label_color?: string;
  notes: string;
  device_info: string;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  client_count?: number;
  created_at: string;
}

export interface Interaction {
  id: number;
  client_id: number;
  type: 'whatsapp' | 'ligacao' | 'visita' | 'anotacao';
  description: string;
  created_at: string;
}

export interface Renewal {
  id: number;
  client_id: number;
  renewed_at: string;
  renewal_year: number;
  previous_activation_date: string | null;
  previous_expiration_date: string | null;
  new_activation_date: string;
  new_expiration_date: string | null;
  plan_type: Client['plan_type'];
  notes: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  expiring_this_month: number;
  expired_clients: number;
  lifetime_clients: number;
  total_monthly_revenue: number;
  clients_by_plan: { plan_type: string; count: number }[];
  expirations_by_month: { month: string; count: number }[];
  recent_clients: Client[];
}
