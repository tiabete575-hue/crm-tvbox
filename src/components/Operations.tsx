'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Kanban,
  MessageSquare,
  BellRing,
  Wallet,
  Search,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Monitor,
  Loader2,
  Send,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '@/components/Toast';
import RenewalModal from '@/components/RenewalModal';

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  activation_date?: string | null;
  expiration_date: string | null;
  plan_type: string;
  plan_value: number;
  status: string;
  device_info?: string | null;
  notes?: string | null;
  label_name?: string | null;
  label_color?: string | null;
  days_left: number | null;
};

type Task = {
  id: string;
  client_id: string;
  name: string;
  phone?: string | null;
  plan_type?: string;
  plan_value?: number;
  device_info?: string | null;
  days_left?: number | null;
  stage: string;
  cycle_date: string;
  notes: string;
  next_contact: string | null;
};

type Reminder = {
  id: string;
  client_id: string;
  name: string;
  phone?: string | null;
  plan_type?: string;
  plan_value?: number;
  device_info?: string | null;
  due_date: string;
  offset_days: number;
};

type Payment = {
  id: string;
  client_id: string;
  name: string | null;
  phone?: string | null;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  method: string;
};

type Template = {
  id: string;
  name: string;
  body: string;
};

type Data = {
  clients: Client[];
  tasks: Task[];
  reminders: Reminder[];
  payments: Payment[];
  templates: Template[];
  monthly: { month: string; total: number }[];
};

const COLUMNS: [string, string][] = [
  ['proxima', 'Renovação próxima'],
  ['contatado', 'Contato realizado'],
  ['aguardando', 'Aguardando resposta'],
  ['interessado', 'Interessado'],
  ['pagamento', 'Aguardando pagamento'],
  ['renovado', 'Renovado'],
  ['perdido', 'Não renovou'],
];

const formatDate = (value: string | null | undefined) =>
  value ? value.slice(0, 10).split('-').reverse().join('/') : 'Data pendente';

const formatMoney = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const inputClass =
  'border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

const primaryBtnClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0';

export default function Operations({
  mode,
}: {
  mode: 'renovacoes' | 'kanban' | 'mensagens' | 'automacoes' | 'financeiro';
}) {
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Filters for Renovacoes
  const [filter, setFilter] = useState('30');
  const [search, setSearch] = useState('');

  // WhatsApp studio state
  const [selected, setSelected] = useState('');
  const [template, setTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '' });
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  // Renewal modal state
  const [renewClient, setRenewClient] = useState<Client | null>(null);

  // Financial state
  const [payment, setPayment] = useState({
    client_id: '',
    description: 'Renovação de plano',
    amount: '',
    due_date: today(),
    method: 'pix',
    paid: true,
  });
  const [paymentFilter, setPaymentFilter] = useState<'todos' | 'recebidos' | 'pendentes' | 'atrasados'>('todos');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/operations', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao carregar');
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(body: unknown, url = '/api/operations', successMsg?: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao salvar');
      if (successMsg) success(successMsg);
      await load();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      setError(msg);
      toastError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    renovacoes: 'Central de Renovações',
    kanban: 'Kanban de Atendimento',
    mensagens: 'Estúdio de Mensagens WhatsApp',
    automacoes: 'Fila de Lembretes Automáticos',
    financeiro: 'Financeiro & Fluxo de Caixa',
  };

  const subtitles = {
    renovacoes: 'Gerencie vencimentos próximos, acione clientes no WhatsApp e confirme renovações integradas ao caixa.',
    kanban: 'Acompanhe cada etapa comercial do ciclo de renovação e mova os atendimentos com clareza.',
    mensagens: 'Personalize modelos com variáveis dinâmicas e registre cada disparo no histórico do cliente.',
    automacoes: 'Marcos automáticos (30 e 7 dias antes, no vencimento, 3 e 15 dias após) sincronizados diariamente.',
    financeiro: 'Controle recebimentos reais, cobranças em aberto e evolução de receita mensal.',
  };

  const client = data?.clients.find((c) => String(c.id) === selected);

  const renderMessage = (body: string, c: Client) =>
    body
      .replaceAll('{nome}', c.name)
      .replaceAll('{vencimento}', formatDate(c.expiration_date))
      .replaceAll('{valor}', formatMoney(c.plan_value))
      .replaceAll('{plano}', c.plan_type);

  const getSmartTemplateBody = (c: Client) => {
    if (!data?.templates.length) {
      return `Olá, ${c.name}! Tudo bem? Passando para falar sobre seu plano de TV Box (${c.plan_type}).`;
    }
    const days = c.days_left ?? 0;
    let chosen = data.templates[0];
    if (days < 0) {
      chosen = data.templates.find((t) => t.name.toLowerCase().includes('vencido')) || chosen;
    } else if (days === 0) {
      chosen = data.templates.find((t) => t.name.toLowerCase().includes('hoje')) || chosen;
    } else {
      chosen = data.templates.find((t) => t.name.toLowerCase().includes('próxima') || t.name.toLowerCase().includes('proxima')) || chosen;
    }
    return renderMessage(chosen.body, c);
  };

  const openWhatsApp = (c: Client, customText?: string) => {
    if (!c.phone) {
      setError('Cliente sem telefone cadastrado.');
      return;
    }
    const rawDigits = c.phone.replace(/\D/g, '');
    const digits = rawDigits.length >= 10 && rawDigits.length <= 11 && !rawDigits.startsWith('55')
      ? `55${rawDigits}`
      : rawDigits;

    if (digits.length < 12 || digits.length > 13) {
      setError('Confira o telefone completo com país (55) e DDD antes de abrir o WhatsApp.');
      return;
    }

    const finalMsg = customText ?? getSmartTemplateBody(c);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(finalMsg)}`;

    // Log interaction & advance Kanban stage from 'proxima' to 'contatado'
    void fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'whatsapp_log',
        client_id: c.id,
        description: `Mensagem iniciada via WhatsApp: "${finalMsg.slice(0, 140)}"`,
      }),
    }).then(() => load());

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  const visibleClients = useMemo(() => {
    if (!data) return [];
    const term = search.toLocaleLowerCase();
    return data.clients.filter((c) => {
      const matchSearch =
        c.name.toLocaleLowerCase().includes(term) ||
        (c.phone || '').toLocaleLowerCase().includes(term) ||
        (c.device_info || '').toLocaleLowerCase().includes(term);

      if (!matchSearch) return false;

      if (filter === 'pendente') {
        return !c.expiration_date && c.plan_type !== 'vitalicio';
      }
      if (filter === 'renovados') {
        return data.tasks.some((t) => String(t.client_id) === String(c.id) && t.stage === 'renovado');
      }
      if (c.plan_type === 'vitalicio' || c.status === 'cancelado' || c.days_left === null) {
        return false;
      }
      if (filter === 'vencidos') return c.days_left < 0;
      if (filter === 'hoje') return c.days_left === 0;
      return c.days_left >= 0 && c.days_left <= Number(filter);
    });
  }, [data, search, filter]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    const currentDay = today();
    const term = paymentSearch.toLocaleLowerCase();
    return data.payments.filter((p) => {
      const matchText =
        (p.name || 'Avulso').toLocaleLowerCase().includes(term) ||
        p.description.toLocaleLowerCase().includes(term) ||
        p.method.toLocaleLowerCase().includes(term);
      if (!matchText) return false;
      if (paymentFilter === 'recebidos') return Boolean(p.paid_at);
      if (paymentFilter === 'pendentes') return !p.paid_at && p.due_date.slice(0, 10) >= currentDay;
      if (paymentFilter === 'atrasados') return !p.paid_at && p.due_date.slice(0, 10) < currentDay;
      return true;
    });
  }, [data, paymentFilter, paymentSearch]);

  if (!data) {
    return (
      <div role="status" className="flex flex-col items-center justify-center min-h-[360px] bg-white rounded-xl border border-slate-200 p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">{error || 'Carregando central de operações…'}</p>
      </div>
    );
  }

  const countsByFilter = {
    hoje: data.clients.filter((c) => c.plan_type !== 'vitalicio' && c.status !== 'cancelado' && c.days_left === 0).length,
    '7': data.clients.filter((c) => c.plan_type !== 'vitalicio' && c.status !== 'cancelado' && c.days_left !== null && c.days_left >= 0 && c.days_left <= 7).length,
    '30': data.clients.filter((c) => c.plan_type !== 'vitalicio' && c.status !== 'cancelado' && c.days_left !== null && c.days_left >= 0 && c.days_left <= 30).length,
    vencidos: data.clients.filter((c) => c.plan_type !== 'vitalicio' && c.status !== 'cancelado' && c.days_left !== null && c.days_left < 0).length,
    renovados: data.clients.filter((c) => data.tasks.some((t) => String(t.client_id) === String(c.id) && t.stage === 'renovado')).length,
    pendente: data.clients.filter((c) => !c.expiration_date && c.plan_type !== 'vitalicio').length,
  };

  const navTabs = [
    { id: 'renovacoes', label: 'Renovações', href: '/renovacoes', icon: CalendarClock, badge: countsByFilter['7'] + countsByFilter.vencidos },
    { id: 'automacoes', label: 'Lembretes do Dia', href: '/automacoes', icon: BellRing, badge: data.reminders.length },
    { id: 'kanban', label: 'Kanban', href: '/kanban', icon: Kanban, badge: data.tasks.filter((t) => t.stage !== 'renovado' && t.stage !== 'perdido').length },
    { id: 'mensagens', label: 'WhatsApp', href: '/mensagens', icon: MessageSquare },
    { id: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Operational Sub-Nav & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{titles[mode]}</h1>
          <p className="text-sm text-slate-500 mt-1">{subtitles[mode]}</p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="font-mono tabular-nums text-[11px] text-slate-500">
                    ({tab.badge})
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs font-semibold underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* ==================== MODO: RENOVAÇÕES ==================== */}
      {mode === 'renovacoes' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['hoje', 'Vence hoje'],
                  ['7', 'Próximos 7 dias'],
                  ['30', 'Próximos 30 dias'],
                  ['vencidos', 'Vencidos'],
                  ['renovados', 'Renovados'],
                  ['pendente', 'Datas pendentes'],
                ] as const
              ).map(([id, name]) => {
                const isSelected = filter === id;
                const count = countsByFilter[id];
                return (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {name}{' '}
                    <span className={`ml-1 font-mono tabular-nums ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                aria-label="Buscar cliente"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar por nome, telefone ou aparelho..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-mono tabular-nums">{visibleClients.length} clientes listados</span>
            <span>Ao clicar em WhatsApp, o contato é salvo no histórico automaticamente</span>
          </div>

          <div className="grid gap-3">
            {visibleClients.map((c) => {
              const days = c.days_left;
              const task = data.tasks.find((t) => String(t.client_id) === String(c.id));
              return (
                <article
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{c.name}</h2>
                      <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                      <span className="text-xs font-medium capitalize text-slate-600">
                        Plano {c.plan_type} ({formatMoney(c.plan_value)})
                      </span>
                      {task && (
                        <>
                          <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                          <span className="text-xs text-blue-700 font-medium">
                            Etapa: {COLUMNS.find(([s]) => s === task.stage)?.[1] || task.stage}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span>{c.phone || 'Telefone pendente'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Vencimento: {formatDate(c.expiration_date)}</span>
                      {days !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-sans font-semibold ${
                              days < 0
                                ? 'text-red-600'
                                : days === 0
                                  ? 'text-amber-600'
                                  : days <= 7
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                            }`}
                          >
                            {days < 0
                              ? `Vencido há ${Math.abs(days)} dias`
                              : days === 0
                                ? 'Vence hoje'
                                : `Faltam ${days} dias`}
                          </span>
                        </>
                      )}
                      {c.device_info && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans inline-flex items-center gap-1 text-slate-600">
                            <Monitor className="w-3.5 h-3.5 text-slate-400" />
                            {c.device_info}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!c.phone}
                      onClick={() => openWhatsApp(c)}
                      className="inline-flex items-center gap-1.5 border border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp
                    </button>
                    <button
                      className={primaryBtnClass}
                      onClick={() => setRenewClient(c)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Confirmar renovação
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {!visibleClients.length && (
            <div className="p-12 bg-white border border-slate-200 rounded-xl text-center">
              <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Nenhum cliente neste filtro.</p>
              <p className="text-xs text-slate-500 mt-1">Altere o filtro acima ou limpe a busca para visualizar outros assinantes.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODO: KANBAN ==================== */}
      {mode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {COLUMNS.map(([stage, title]) => {
            const stageTasks = data.tasks.filter((t) => t.stage === stage);
            const stageTotal = stageTasks.reduce((acc, t) => acc + Number(t.plan_value || 0), 0);
            return (
              <section
                key={stage}
                className="min-w-[280px] w-72 shrink-0 bg-slate-100/90 border border-slate-200/80 rounded-xl p-3 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">{title}</h2>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500">
                      {formatMoney(stageTotal)}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {stageTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageTasks.map((t) => {
                    const taskClient = data.clients.find((c) => String(c.id) === String(t.client_id));
                    return (
                      <article
                        key={t.id}
                        draggable={stage !== 'renovado'}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm text-slate-900 leading-snug">{t.name}</h3>
                            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                              Ciclo: {formatDate(t.cycle_date)}
                              {t.plan_value ? ` · ${formatMoney(Number(t.plan_value))}` : ''}
                            </p>
                          </div>
                          {taskClient?.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(taskClient)}
                              title="Enviar WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-colors shrink-0"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <select
                          aria-label={`Etapa de ${t.name}`}
                          disabled={busy || stage === 'renovado'}
                          className={inputClass}
                          value={t.stage}
                          onChange={(e) =>
                            void save(
                              {
                                action: 'task',
                                id: t.id,
                                stage: e.target.value,
                                notes: t.notes,
                                next_contact: t.next_contact?.slice(0, 10),
                              },
                              '/api/operations',
                              'Etapa atualizada!'
                            )
                          }
                        >
                          {COLUMNS.filter(([s]) => s !== 'renovado' || stage === 'renovado').map(([s, n]) => (
                            <option key={s} value={s}>
                              {n}
                            </option>
                          ))}
                        </select>

                        <label className="text-xs text-slate-600 block">
                          Próximo contato
                          <input
                            type="date"
                            defaultValue={t.next_contact?.slice(0, 10) || ''}
                            className={`${inputClass} mt-1 font-mono tabular-nums`}
                            onBlur={(e) => {
                              if (e.target.value !== (t.next_contact?.slice(0, 10) || '')) {
                                void save(
                                  {
                                    action: 'task',
                                    id: t.id,
                                    stage: t.stage,
                                    notes: t.notes,
                                    next_contact: e.target.value,
                                  },
                                  '/api/operations',
                                  'Data de retorno salva!'
                                );
                              }
                            }}
                            disabled={busy || stage === 'renovado'}
                          />
                        </label>

                        <textarea
                          aria-label={`Observações de ${t.name}`}
                          defaultValue={t.notes}
                          rows={2}
                          placeholder="Observações do atendimento"
                          className={`${inputClass} resize-none`}
                          onBlur={(e) => {
                            if (e.target.value !== t.notes) {
                              void save(
                                {
                                  action: 'task',
                                  id: t.id,
                                  stage: t.stage,
                                  notes: e.target.value,
                                  next_contact: t.next_contact?.slice(0, 10),
                                },
                                '/api/operations',
                                'Observação salva!'
                              );
                            }
                          }}
                          disabled={busy || stage === 'renovado'}
                        />

                        {stage !== 'renovado' && (
                          <button
                            className={`${primaryBtnClass} w-full`}
                            onClick={() => {
                              setRenewClient(
                                taskClient || null
                              );
                            }}
                          >
                            Confirmar renovação
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div
                  aria-label={`Mover para ${title}`}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-xs text-center text-slate-500 mt-3 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const t = data.tasks.find((task) => String(task.id) === e.dataTransfer.getData('text/plain'));
                    if (!t) return;
                    if (stage === 'renovado') {
                      setRenewClient(data.clients.find((c) => String(c.id) === String(t.client_id)) || null);
                    } else {
                      void save(
                        {
                          action: 'task',
                          id: t.id,
                          stage,
                          notes: t.notes,
                          next_contact: t.next_contact?.slice(0, 10),
                        },
                        '/api/operations',
                        `Movido para ${title}`
                      );
                    }
                  }}
                >
                  Arraste um cartão aqui
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ==================== MODO: MENSAGENS WHATSAPP ==================== */}
      {mode === 'mensagens' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Preparar & Enviar */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Preparar mensagem</h2>
                <p className="text-xs text-slate-500">Selecione o cliente e o modelo para preencher os dados automaticamente</p>
              </div>
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
              <select
                aria-label="Cliente"
                className={inputClass}
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  const c = data.clients.find((cl) => String(cl.id) === e.target.value);
                  const t = data.templates.find((tp) => String(tp.id) === template) || data.templates[0];
                  if (c && t) {
                    if (!template) setTemplate(String(t.id));
                    setMessage(renderMessage(t.body, c));
                  }
                }}
              >
                <option value="">Escolha o cliente</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone || 'Sem telefone'} ({formatDate(c.expiration_date)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Modelo de Mensagem</label>
              <select
                aria-label="Modelo"
                className={inputClass}
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  const t = data.templates.find((tp) => String(tp.id) === e.target.value);
                  if (t && client) setMessage(renderMessage(t.body, client));
                }}
              >
                <option value="">Escolha um modelo</option>
                {data.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Mensagem Final</label>
                <button
                  type="button"
                  disabled={!message}
                  onClick={() => {
                    navigator.clipboard.writeText(message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar texto'}
                </button>
              </div>
              <textarea
                aria-label="Mensagem"
                rows={6}
                className={inputClass}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Selecione um cliente e um modelo acima..."
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50"
                disabled={!client?.phone || !message}
                onClick={() => client && openWhatsApp(client, message)}
              >
                <Send className="w-4 h-4" />
                Revisar e enviar no WhatsApp
              </button>
            </div>
            <p className="text-xs text-slate-500">
              A conversa será aberta no WhatsApp e o contato será registrado automaticamente no histórico do cliente.
            </p>
          </div>

          {/* Modelos Salvos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Modelos de Mensagem</h2>
                <p className="text-xs text-slate-500">
                  Variáveis disponíveis: <code className="font-mono">{'{nome}, {vencimento}, {valor}, {plano}'}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTemplate(!showNewTemplate)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Modelo
              </button>
            </div>

            {showNewTemplate && (
              <form
                className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(
                    { action: 'create_template', name: newTemplate.name, body: newTemplate.body },
                    '/api/operations',
                    'Novo modelo criado!'
                  ).then((ok) => {
                    if (ok) {
                      setNewTemplate({ name: '', body: '' });
                      setShowNewTemplate(false);
                    }
                  });
                }}
              >
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Criar Novo Modelo</h3>
                <input
                  type="text"
                  required
                  placeholder="Nome do modelo (ex: Cobrança PIX)"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className={inputClass}
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Olá, {nome}! Seu plano {plano} de {valor} vence em {vencimento}..."
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  className={inputClass}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button type="submit" disabled={busy} className={primaryBtnClass}>
                    Adicionar Modelo
                  </button>
                </div>
              </form>
            )}

            {data.templates.map((t) => (
              <form
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  void save(
                    { action: 'template', id: t.id, body: form.get('body') },
                    '/api/operations',
                    'Modelo atualizado!'
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-900">{t.name}</h3>
                  {data.templates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => void save({ action: 'delete_template', id: t.id }, '/api/operations', 'Modelo removido!')}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Excluir modelo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  name="body"
                  aria-label={t.name}
                  rows={3}
                  defaultValue={t.body}
                  className={inputClass}
                  required
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 font-mono">
                    {'{nome}, {vencimento}, {valor}, {plano}'}
                  </span>
                  <button className={primaryBtnClass} disabled={busy}>
                    Salvar modelo
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MODO: AUTOMAÇÕES / LEMBRETES ==================== */}
      {mode === 'automacoes' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-blue-600" />
                Régua de Lembretes Automáticos no CRM
              </h2>
              <p className="text-sm text-slate-600">
                Tarefas geradas automaticamente <strong>30 e 7 dias antes</strong>, no <strong>dia do vencimento</strong>, e <strong>3 e 15 dias depois</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Renovações encerram automaticamente as pendências do ciclo anterior. O disparo do WhatsApp é revisado por você com 1 clique.
              </p>
            </div>
            <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
              <span className="text-xs text-slate-500 block">Pendentes Hoje</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">{data.reminders.length}</span>
            </div>
          </div>

          <div className="grid gap-3">
            {data.reminders.map((r) => {
              const targetClient = data.clients.find((c) => String(c.id) === String(r.client_id));
              return (
                <article
                  key={r.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{r.name}</h2>
                      {r.plan_type && (
                        <>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-medium capitalize text-slate-600">
                            {r.plan_type} ({formatMoney(Number(r.plan_value || 0))})
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      Marco: {formatDate(r.due_date)} ·{' '}
                      <span
                        className={`font-sans font-semibold ${
                          r.offset_days < 0
                            ? 'text-red-600'
                            : r.offset_days === 0
                              ? 'text-amber-600'
                              : 'text-blue-600'
                        }`}
                      >
                        {r.offset_days > 0
                          ? `${r.offset_days} dias antes do vencimento`
                          : r.offset_days === 0
                            ? 'Dia do vencimento'
                            : `${-r.offset_days} dias após o vencimento`}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1.5 border border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                      onClick={() => {
                        if (targetClient) openWhatsApp(targetClient);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp
                    </button>
                    {targetClient && (
                      <button
                        type="button"
                        onClick={() => setRenewClient(targetClient)}
                        className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Renovar
                      </button>
                    )}
                    <button
                      className={primaryBtnClass}
                      disabled={busy}
                      onClick={() =>
                        void save({ action: 'reminder', id: r.id }, '/api/operations', 'Tarefa concluída!')
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Concluir tarefa
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {!data.reminders.length && (
            <div className="bg-white border border-slate-200 p-10 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">Nenhum lembrete pendente para hoje.</p>
              <p className="text-xs text-slate-500 mt-1">Todas as tarefas programadas da régua de contato foram concluídas.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODO: FINANCEIRO ==================== */}
      {mode === 'financeiro' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {(
              [
                [
                  'Recebido Total',
                  data.payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0),
                  'text-emerald-700',
                  CheckCircle2,
                ],
                [
                  'A receber',
                  data.payments.filter((p) => !p.paid_at).reduce((s, p) => s + Number(p.amount), 0),
                  'text-blue-700',
                  Clock,
                ],
                [
                  'Em atraso',
                  data.payments
                    .filter((p) => !p.paid_at && p.due_date.slice(0, 10) < today())
                    .reduce((s, p) => s + Number(p.amount), 0),
                  'text-red-600',
                  AlertTriangle,
                ],
              ] as const
            ).map(([label, value, colorClass, Icon]) => (
              <div key={label} className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${colorClass}`}>
                    {formatMoney(Number(value))}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form Registrar Cobrança ou Recebimento */}
            <form
              className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-xl grid sm:grid-cols-2 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save({ action: 'payment', ...payment }, '/api/operations', 'Lançamento financeiro salvo!').then(
                  (ok) => {
                    if (ok) setPayment({ ...payment, amount: '' });
                  }
                );
              }}
            >
              <div className="sm:col-span-2 border-b border-slate-100 pb-3">
                <h2 className="font-bold text-slate-900">Registrar cobrança ou recebimento</h2>
                <p className="text-xs text-slate-500">Adicione entradas avulsas ou mensalidades recebidas</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
                <select
                  aria-label="Cliente do lançamento"
                  className={inputClass}
                  value={payment.client_id}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const cl = data.clients.find((c) => String(c.id) === cid);
                    setPayment({
                      ...payment,
                      client_id: cid,
                      amount: cl && !payment.amount ? String(cl.plan_value || '') : payment.amount,
                    });
                  }}
                >
                  <option value="">Sem cliente vinculado</option>
                  {data.clients.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
                <input
                  aria-label="Descrição"
                  required
                  className={inputClass}
                  value={payment.description}
                  onChange={(e) => setPayment({ ...payment, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input
                  aria-label="Valor"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Valor em reais"
                  className={`${inputClass} font-mono tabular-nums`}
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Data de Vencimento / Caixa</label>
                <input
                  aria-label="Data do lançamento"
                  required
                  type="date"
                  className={`${inputClass} font-mono tabular-nums`}
                  value={payment.due_date}
                  onChange={(e) => setPayment({ ...payment, due_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                <select
                  aria-label="Forma de pagamento"
                  className={inputClass}
                  value={payment.method}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                >
                  {['pix', 'dinheiro', 'cartao', 'transferencia', 'outro'].map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={payment.paid}
                    onChange={(e) => setPayment({ ...payment, paid: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  Já recebido nesta data
                </label>
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <button className={primaryBtnClass} disabled={busy}>
                  Salvar lançamento
                </button>
              </div>
            </form>

            {/* Recebimentos por mês */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-slate-900 mb-1">Recebimentos por mês</h2>
                <p className="text-xs text-slate-500 mb-4">Histórico consolidado de caixa pago</p>

                {data.monthly.length > 0 && (
                  <div className="h-36 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...data.monthly].reverse()}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis hide />
                        <RechartsTooltip formatter={(v) => [formatMoney(Number(v)), 'Recebido']} />
                        <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {data.monthly.map((m) => (
                    <div key={m.month} className="flex justify-between text-sm border-b border-slate-100 py-2 font-mono tabular-nums">
                      <span className="text-slate-600">{m.month}</span>
                      <span className="font-semibold text-slate-900">{formatMoney(m.total)}</span>
                    </div>
                  ))}
                  {!data.monthly.length && (
                    <p className="text-xs text-slate-500 py-4">
                      Nenhum recebimento registrado ainda. Os valores dos planos entram aqui assim que baixados.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Lançamentos com Filtros */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400 mr-1" />
                {(
                  [
                    ['todos', 'Todos'],
                    ['recebidos', 'Recebidos'],
                    ['pendentes', 'A Receber'],
                    ['atrasados', 'Em Atraso'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentFilter(id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      paymentFilter === id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar lançamentos..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="p-3.5">Cliente / descrição</th>
                    <th className="p-3.5">Método</th>
                    <th className="p-3.5 text-right">Valor</th>
                    <th className="p-3.5">Vencimento</th>
                    <th className="p-3.5">Situação</th>
                    <th className="p-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => {
                    const isOverdue = !p.paid_at && p.due_date.slice(0, 10) < today();
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <span className="font-medium text-slate-900">{p.name || 'Avulso'}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="text-slate-600">{p.description}</span>
                        </td>
                        <td className="p-3.5 uppercase text-xs font-mono text-slate-500">{p.method}</td>
                        <td className="p-3.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatMoney(p.amount)}
                        </td>
                        <td className="p-3.5 font-mono tabular-nums text-slate-600">{formatDate(p.due_date)}</td>
                        <td className="p-3.5">
                          {p.paid_at ? (
                            <span className="text-emerald-700 font-medium text-xs">
                              Pago em <span className="font-mono tabular-nums">{formatDate(p.paid_at)}</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="text-red-600 font-semibold text-xs">Em atraso</span>
                          ) : (
                            <span className="text-amber-600 font-medium text-xs">Pendente</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!p.paid_at && (
                              <button
                                disabled={busy}
                                className={primaryBtnClass}
                                onClick={() =>
                                  void save({ action: 'paid', id: p.id }, '/api/operations', 'Pagamento baixado!')
                                }
                              >
                                Receber hoje
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPaymentToDelete(p)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredPayments.length && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                        Nenhum lançamento encontrado para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Pagamento */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Excluir lançamento?</h3>
            <p className="text-sm text-slate-600">
              Deseja remover o lançamento <strong>{paymentToDelete.description}</strong> no valor de{' '}
              <strong className="font-mono tabular-nums">{formatMoney(paymentToDelete.amount)}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void save(
                    { action: 'delete_payment', id: paymentToDelete.id },
                    '/api/operations',
                    'Lançamento excluído!'
                  ).then(() => setPaymentToDelete(null));
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Renovação + Financeiro */}
      <RenewalModal
        client={renewClient}
        isOpen={Boolean(renewClient)}
        onClose={() => setRenewClient(null)}
        onSuccess={() => void load()}
      />
    </div>
  );
}
