'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Crown,
  DollarSign,
  Wallet,
  Clock,
  MessageCircle,
  RefreshCw,
  ArrowRight,
  Kanban,
  Loader2,
  BellRing,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DashboardStats, Client } from '@/lib/types';
import { useToast } from '@/components/Toast';
import RenewalModal from '@/components/RenewalModal';

const STAGE_LABELS: Record<string, string> = {
  proxima: 'Renovação próxima',
  contatado: 'Contato realizado',
  aguardando: 'Aguardando resposta',
  interessado: 'Interessado',
  pagamento: 'Aguardando pagamento',
  renovado: 'Renovado',
  perdido: 'Não renovou',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewClient, setRenewClient] = useState<Client | null>(null);
  const { error } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      error('Erro ao carregar dados do dashboard. Verifique sua conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Carregando indicadores executivos...</p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const openQuickWhatsApp = (client: Client) => {
    if (!client.phone) return;
    const raw = client.phone.replace(/\D/g, '');
    const digits = raw.startsWith('55') ? raw : `55${raw}`;
    const expStr = formatDate(client.expiration_date);
    const isExpired = (client.days_left ?? 0) < 0;
    const text = isExpired
      ? `Olá, ${client.name}! Notamos que seu plano de TV Box (${client.plan_type}) venceu em ${expStr}. Gostaria de renovar seu acesso?`
      : `Olá, ${client.name}! Seu plano de TV Box (${client.plan_type}) vence em ${expStr}. Podemos adiantar sua renovação?`;

    void fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'whatsapp_log',
        client_id: client.id,
        description: `Contato rápido via Dashboard: "${text}"`,
      }),
    });

    const a = document.createElement('a');
    a.href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const planColors: Record<string, string> = {
    mensal: '#0ea5e9',
    trimestral: '#6366f1',
    semestral: '#f59e0b',
    anual: '#2563eb',
    vitalicio: '#16a34a',
  };

  const retentionRate =
    stats.total_clients > 0
      ? Math.round(((stats.active_clients + stats.lifetime_clients) / stats.total_clients) * 100)
      : 100;

  const primaryCards = [
    {
      title: 'Total de Clientes',
      value: stats.total_clients,
      sub: `${retentionRate}% ativos na carteira`,
      icon: Users,
      iconColor: 'text-blue-600',
      bgIcon: 'bg-blue-50',
    },
    {
      title: 'Assinantes Ativos',
      value: stats.active_clients,
      sub: `${stats.lifetime_clients} vitalícios inclusos`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bgIcon: 'bg-emerald-50',
    },
    {
      title: 'Vencendo em 30 Dias',
      value: stats.expiring_this_month,
      sub: `${stats.expiring_7_days || 0} nos próximos 7 dias`,
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      bgIcon: 'bg-amber-50',
    },
    {
      title: 'Planos Vencidos',
      value: stats.expired_clients,
      sub: 'Aguardando recuperação',
      icon: XCircle,
      iconColor: 'text-red-600',
      bgIcon: 'bg-red-50',
    },
  ];

  const financialCards = [
    {
      title: 'MRR Estimado (Planos)',
      value: formatCurrency(stats.total_monthly_revenue),
      sub: 'Receita recorrente mensal',
      icon: DollarSign,
      color: 'text-slate-900',
    },
    {
      title: 'Caixa Recebido no Mês',
      value: formatCurrency(stats.received_this_month || 0),
      sub: 'Pagamentos baixados no mês',
      icon: Wallet,
      color: 'text-emerald-700',
    },
    {
      title: 'Cobranças A Receber',
      value: formatCurrency(stats.pending_this_month || 0),
      sub: 'Lançamentos em aberto no prazo',
      icon: Clock,
      color: 'text-blue-700',
    },
    {
      title: 'Financeiro em Atraso',
      value: formatCurrency(stats.overdue_total || 0),
      sub: `${stats.pending_reminders_count || 0} lembretes pendentes hoje`,
      icon: BellRing,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-slate-500 mt-1">
            Métricas consolidadas da carteira de assinantes, renovações urgentes e fluxo de caixa real
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/automacoes"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <BellRing className="w-4 h-4 text-amber-600" />
            Lembretes de Hoje ({stats.pending_reminders_count || 0})
          </Link>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Abrir Financeiro
          </Link>
        </div>
      </div>

      {/* Subscriber KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between transition-colors hover:border-slate-300"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{card.title}</p>
                <h2 className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {card.value}
                </h2>
                <p className="text-xs text-slate-500 mt-1.5">{card.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.bgIcon}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Financial Cashflow Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Resumo Financeiro & Caixa Real</h2>
            <p className="text-xs text-slate-500">Comparativo entre receita estimada dos planos e lançamentos reais do módulo Financeiro</p>
          </div>
          <Link href="/financeiro" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
            Ver extrato completo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialCards.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.title}</span>
                </div>
                <p className={`text-2xl font-bold font-mono tabular-nums ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-xs text-slate-500">{item.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Renewals Queue + Kanban Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fila de Ação Rápida */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Radar de Vencimentos Urgentes (7 dias e Vencidos)</h2>
              <p className="text-xs text-slate-500">Acione via WhatsApp ou confirme a renovação com baixa financeira imediata</p>
            </div>
            <Link href="/renovacoes" className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
              Ver fila completa
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {!stats.urgent_renewals || stats.urgent_renewals.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Nenhum cliente vencido ou vencendo nos próximos 7 dias.
              </div>
            ) : (
              stats.urgent_renewals.map((c) => {
                const days = c.days_left ?? 0;
                return (
                  <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{c.name}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs capitalize text-slate-600">{c.plan_type}</span>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          ({formatCurrency(c.plan_value)})
                        </span>
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500 flex items-center gap-2">
                        <span>{c.phone || 'Sem telefone'}</span>
                        <span>·</span>
                        <span>Vence: {formatDate(c.expiration_date)}</span>
                        <span>·</span>
                        <span
                          className={`font-sans font-semibold ${
                            days < 0 ? 'text-red-600' : days === 0 ? 'text-amber-600' : 'text-amber-600'
                          }`}
                        >
                          {days < 0
                            ? `${Math.abs(days)}d em atraso`
                            : days === 0
                              ? 'Vence hoje'
                              : `Em ${days} dias`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={!c.phone}
                        onClick={() => openQuickWhatsApp(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenewClient(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Renovar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Funil do Kanban */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Funil de Atendimento</h2>
                <p className="text-xs text-slate-500">Distribuição do Kanban atual</p>
              </div>
              <Kanban className="w-4 h-4 text-blue-600" />
            </div>

            <div className="space-y-3">
              {Object.entries(STAGE_LABELS).map(([stageKey, stageLabel]) => {
                const row = stats.kanban_summary?.find((k) => k.stage === stageKey);
                const count = row?.count || 0;
                const val = row?.total_value || 0;
                return (
                  <div key={stageKey} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium">{stageLabel}</span>
                    <div className="text-right font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{count}</span>
                      <span className="text-xs text-slate-400 ml-2">({formatCurrency(val)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/kanban"
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Abrir quadro Kanban <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Clientes por Ciclo de Plano</h3>
          <p className="text-xs text-slate-500 mb-4">Proporção de assinaturas mensais, trimestrais, semestrais, anuais e vitalícias</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.clients_by_plan}
                  dataKey="count"
                  nameKey="plan_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: PieLabelRenderProps) =>
                    `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {stats.clients_by_plan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={planColors[entry.plan_type] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [value, 'Clientes']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Projeção de Vencimentos por Mês</h3>
          <p className="text-xs text-slate-500 mb-4">Volume de renovações previstas nos próximos 12 meses</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.expirations_by_month} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value) => [value, 'Vencimentos']} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Vencimentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Cadastros Recentes</h3>
          <Link href="/clientes" className="text-xs font-semibold text-blue-600 hover:underline">
            Ver todos os clientes
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                <th className="py-3 px-6">Nome</th>
                <th className="py-3 px-6">Plano</th>
                <th className="py-3 px-6">Ativação</th>
                <th className="py-3 px-6">Vencimento</th>
                <th className="py-3 px-6">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum cliente recente encontrado.
                  </td>
                </tr>
              ) : (
                stats.recent_clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-900">{client.name}</td>
                    <td className="py-3 px-6 capitalize text-slate-600">
                      {client.plan_type} · <span className="font-mono tabular-nums">{formatCurrency(client.plan_value)}</span>
                    </td>
                    <td className="py-3 px-6 font-mono tabular-nums text-slate-500">{formatDate(client.activation_date)}</td>
                    <td className="py-3 px-6 font-mono tabular-nums text-slate-500">
                      {client.plan_type === 'vitalicio' ? 'Vitalício' : formatDate(client.expiration_date)}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`text-xs font-semibold ${
                          client.status === 'ativo'
                            ? 'text-emerald-700'
                            : client.status === 'vencido'
                              ? 'text-red-600'
                              : 'text-slate-500'
                        }`}
                      >
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

      <RenewalModal
        client={renewClient}
        isOpen={Boolean(renewClient)}
        onClose={() => setRenewClient(null)}
        onSuccess={() => void fetchStats()}
      />
    </div>
  );
}
