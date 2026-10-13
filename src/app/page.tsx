'use client';

import { useEffect, useState } from 'react';
import { 
  Users, CheckCircle, AlertTriangle, XCircle, Crown, DollarSign, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DashboardStats, Client } from '@/lib/types';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Falha ao carregar dashboard');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        error('Erro ao carregar dados do dashboard. Verifique sua conexão.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [error]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Carregando dashboard...</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const planColors: Record<string, string> = {
    'anual': '#3b82f6', // blue
    'semestral': '#f59e0b', // amber
    'vitalicio': '#22c55e', // green
  };

  const cards = [
    { title: 'Total Clientes', value: stats.total_clients, icon: Users, color: 'border-l-blue-500', iconColor: 'text-blue-500', bgIcon: 'bg-blue-100' },
    { title: 'Ativos', value: stats.active_clients, icon: CheckCircle, color: 'border-l-green-500', iconColor: 'text-green-500', bgIcon: 'bg-green-100' },
    { title: 'Vencendo este Mês', value: stats.expiring_this_month, icon: AlertTriangle, color: 'border-l-yellow-500', iconColor: 'text-yellow-600', bgIcon: 'bg-yellow-100' },
    { title: 'Vencidos', value: stats.expired_clients, icon: XCircle, color: 'border-l-red-500', iconColor: 'text-red-500', bgIcon: 'bg-red-100' },
    { title: 'Vitalícios', value: stats.lifetime_clients, icon: Crown, color: 'border-l-purple-500', iconColor: 'text-purple-500', bgIcon: 'bg-purple-100' },
    { title: 'Receita Mensal', value: formatCurrency(stats.total_monthly_revenue), icon: DollarSign, color: 'border-l-emerald-500', iconColor: 'text-emerald-500', bgIcon: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do seu negócio de TV Box</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${card.color} border-l-4 transition-transform hover:-translate-y-1 duration-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
                  <h3 className="text-3xl font-bold text-slate-800">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${card.bgIcon}`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Clientes por Plano</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.clients_by_plan}
                  dataKey="count"
                  nameKey="plan_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} ${(((props.percent ?? 0)) * 100).toFixed(0)}%`}
                >
                  {stats.clients_by_plan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={planColors[entry.plan_type] || '#cbd5e1'} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [value, 'Clientes']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Vencimentos por Mês</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expirations_by_month} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value) => [value, 'Vencimentos']} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Vencimentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Clientes Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                <th className="py-3 px-6">Nome</th>
                <th className="py-3 px-6">Plano</th>
                <th className="py-3 px-6">Ativação</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Nenhum cliente recente encontrado.
                  </td>
                </tr>
              ) : (
                stats.recent_clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-800">{client.name}</td>
                    <td className="py-3 px-6">
                      <span className="capitalize">{client.plan_type}</span>
                    </td>
                    <td className="py-3 px-6 text-slate-500">{formatDate(client.activation_date)}</td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        client.status === 'vencido' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
