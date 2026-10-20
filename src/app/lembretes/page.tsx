'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, AlertCircle, Phone, MessageCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '@/lib/types';
import { useToast } from '@/components/Toast';
import RenewalModal from '@/components/RenewalModal';

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming');
  const [upcoming, setUpcoming] = useState<Client[]>([]);
  const [overdue, setOverdue] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewClient, setRenewClient] = useState<Client | null>(null);

  const { error } = useToast();

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const [upcomingRes, overdueRes] = await Promise.all([
        fetch('/api/reminders', { cache: 'no-store' }),
        fetch('/api/reminders/overdue', { cache: 'no-store' }),
      ]);

      if (upcomingRes.ok && overdueRes.ok) {
        setUpcoming(await upcomingRes.json());
        setOverdue(await overdueRes.json());
      }
    } catch {
      error('Erro ao carregar lembretes.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchReminders();
  }, [fetchReminders]);

  const getWhatsAppMessage = (client: Client) => {
    const isOverdue = new Date(client.expiration_date) < new Date();
    const dateStr = format(parseISO(client.expiration_date), 'dd/MM', { locale: ptBR });

    const msg = isOverdue
      ? `Olá ${client.name}! Notamos que seu plano de TV Box (${client.plan_type}) venceu no dia ${dateStr}. Gostaria de renovar seu acesso para continuar assistindo?`
      : `Olá ${client.name}! Seu plano de TV Box (${client.plan_type}) vence em breve, no dia ${dateStr}. Gostaria de já deixar renovado?`;

    return encodeURIComponent(msg);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const renderClientCard = (client: Client) => {
    const days = differenceInDays(parseISO(client.expiration_date), new Date());
    const isOverdue = days < 0;

    return (
      <div
        key={client.id}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 text-base">{client.name}</h3>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="capitalize font-medium text-slate-700">Plano {client.plan_type}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">{client.phone || 'Sem telefone'}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">Vencimento: {formatDate(client.expiration_date)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
            <div
              className={`text-xs font-semibold font-mono tabular-nums ${
                isOverdue ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {isOverdue ? `${Math.abs(days)} dias em atraso` : `${days} dias restantes`}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={
                  client.phone
                    ? `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${getWhatsAppMessage(client)}`
                    : '#'
                }
                target="_blank"
                rel="noreferrer"
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors"
                title="Enviar WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href={client.phone ? `tel:${client.phone.replace(/\D/g, '')}` : '#'}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                title="Ligar"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                onClick={() => setRenewClient(client)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Renovar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentList = activeTab === 'upcoming' ? upcoming : overdue;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Radar de Vencimentos</h1>
            <p className="text-sm text-slate-500">Acompanhe vencimentos próximos e planos em atraso</p>
          </div>
        </div>

        <Link
          href="/automacoes"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors self-start sm:self-auto"
        >
          Ir para Régua de Lembretes do Dia <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Vencendo em 30 dias ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'overdue'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Vencidos ({overdue.length})
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
            <h3 className="text-base font-bold text-slate-800">Tudo em dia!</h3>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'upcoming'
                ? 'Nenhum plano vencendo nos próximos 30 dias.'
                : 'Nenhum cliente com plano vencido.'}
            </p>
          </div>
        ) : (
          currentList.map(renderClientCard)
        )}
      </div>

      <RenewalModal
        client={renewClient}
        isOpen={Boolean(renewClient)}
        onClose={() => setRenewClient(null)}
        onSuccess={() => void fetchReminders()}
      />
    </div>
  );
}
