'use client';

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Phone, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client } from '@/lib/types';
import { useToast } from '@/components/Toast';

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming');
  const [upcoming, setUpcoming] = useState<Client[]>([]);
  const [overdue, setOverdue] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  
  const { success, error } = useToast();

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const [upcomingRes, overdueRes] = await Promise.all([
        fetch('/api/reminders'),
        fetch('/api/reminders/overdue')
      ]);

      if (upcomingRes.ok && overdueRes.ok) {
        setUpcoming(await upcomingRes.json());
        setOverdue(await overdueRes.json());
      }
    } catch (err) {
      error('Erro ao carregar lembretes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleRenew = async (id: number) => {
    if (!confirm('Deseja renovar o plano deste cliente agora?')) return;
    
    try {
      setRenewingId(id);
      const res = await fetch('/api/clients/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!res.ok) throw new Error();

      success('Plano renovado com sucesso!');
      fetchReminders();
    } catch (err) {
      error('Erro ao renovar plano.');
    } finally {
      setRenewingId(null);
    }
  };

  const getWhatsAppMessage = (client: Client) => {
    const isOverdue = new Date(client.expiration_date) < new Date();
    const dateStr = format(parseISO(client.expiration_date), 'dd/MM', { locale: ptBR });
    
    let msg = '';
    if (isOverdue) {
      msg = `Olá ${client.name}! Notamos que seu plano de TV Box (${client.plan_type}) venceu no dia ${dateStr}. Gostaria de renovar seu acesso para continuar assistindo? 📺`;
    } else {
      msg = `Olá ${client.name}! Seu plano de TV Box (${client.plan_type}) vence em breve, no dia ${dateStr}. Gostaria de já deixar renovado? 📺`;
    }
    
    return encodeURIComponent(msg);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getUrgencyColor = (dateStr: string) => {
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const renderClientCard = (client: Client) => {
    const days = differenceInDays(parseISO(client.expiration_date), new Date());
    const isOverdue = days < 0;
    
    return (
      <div key={client.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-lg">{client.name}</h3>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{client.plan_type}</span>
              <span>•</span>
              <span>{client.phone || 'Sem telefone'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
            <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium text-center min-w-[120px] ${getUrgencyColor(client.expiration_date)}`}>
              <div className="text-xs opacity-80 uppercase tracking-wide">
                {isOverdue ? 'Venceu em' : 'Vence em'}
              </div>
              <div>{formatDate(client.expiration_date)}</div>
              <div className="text-xs font-bold mt-0.5">
                {isOverdue ? `${Math.abs(days)} dias atrás` : `${days} dias restantes`}
              </div>
            </div>

            <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
              <a 
                href={client.phone ? `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${getWhatsAppMessage(client)}` : '#'}
                target="_blank" rel="noreferrer"
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-green-200 transition-colors tooltip-trigger"
                title="Enviar WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a 
                href={client.phone ? `tel:${client.phone.replace(/\D/g, '')}` : '#'}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                title="Ligar"
              >
                <Phone className="w-5 h-5" />
              </a>
              <button 
                onClick={() => handleRenew(client.id)}
                disabled={renewingId === client.id}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {renewingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
      <div className="flex items-center gap-3">
        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lembretes</h1>
          <p className="text-slate-500">Acompanhe os vencimentos de planos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming' 
              ? 'border-yellow-500 text-yellow-600 bg-yellow-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Vencendo em 30 dias
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-200'}`}>
            {upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overdue' 
              ? 'border-red-500 text-red-600 bg-red-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Vencidos
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'overdue' ? 'bg-red-200 text-red-800' : 'bg-slate-200'}`}>
            {overdue.length}
          </span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-slate-400 animate-spin" /></div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">Tudo em dia!</h3>
            <p className="text-slate-500 mt-1">
              {activeTab === 'upcoming' ? 'Nenhum plano vencendo nos próximos 30 dias.' : 'Nenhum cliente com plano vencido.'}
            </p>
          </div>
        ) : (
          currentList.map(renderClientCard)
        )}
      </div>
    </div>
  );
}
