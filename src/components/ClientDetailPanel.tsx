'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  CreditCard,
  Monitor,
  MessageCircle,
  PhoneCall,
  Home,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Interaction, Renewal } from '@/lib/types';
import { useToast } from '@/components/Toast';
import RenewalModal from '@/components/RenewalModal';

interface ClientDetailPanelProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDetailPanel({ client, isOpen, onClose, onUpdate }: ClientDetailPanelProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [detailClient, setDetailClient] = useState(client);
  const [loading, setLoading] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const { success, error } = useToast();

  const [newInteraction, setNewInteraction] = useState({
    type: 'whatsapp' as Interaction['type'],
    description: '',
  });

  const fetchInteractions = useCallback(async () => {
    try {
      const res = await fetch(`/api/interactions/${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setInteractions(data);
      }
    } catch (err) {
      console.error('Failed to fetch interactions', err);
    }
  }, [client.id]);

  const fetchRenewals = useCallback(async () => {
    try {
      const res = await fetch(`/api/renewals/${client.id}`);
      if (res.ok) setRenewals(await res.json());
    } catch (err) {
      console.error('Failed to fetch renewals', err);
    }
  }, [client.id]);

  const refreshClientData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      if (res.ok) {
        setDetailClient(await res.json());
      }
    } catch {
      // ignore
    }
    await Promise.all([fetchRenewals(), fetchInteractions(), onUpdate()]);
  }, [client.id, fetchRenewals, fetchInteractions, onUpdate]);

  useEffect(() => {
    if (isOpen && client.id) {
      setDetailClient(client);
      void fetchInteractions();
      void fetchRenewals();
    }
  }, [isOpen, client, fetchInteractions, fetchRenewals]);

  const handleSaveInteraction = async () => {
    if (!newInteraction.description.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          ...newInteraction,
        }),
      });

      if (!res.ok) throw new Error();

      success('Interação salva com sucesso!');
      setNewInteraction({ type: 'whatsapp', description: '' });
      setShowInteractionForm(false);
      void fetchInteractions();
    } catch {
      error('Erro ao salvar interação.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (dateStr: string, includeTime = false) => {
    if (!dateStr) return '-';
    try {
      const formatStr = includeTime ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy';
      return format(parseISO(dateStr), formatStr, { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getPhoneLink = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    return `https://wa.me/${clean.startsWith('55') ? clean : `55${clean}`}`;
  };

  const InteractionIcon = ({ type }: { type: Interaction['type'] }) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'ligacao':
        return <PhoneCall className="w-4 h-4 text-blue-600" />;
      case 'visita':
        return <Home className="w-4 h-4 text-amber-600" />;
      case 'anotacao':
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-200 animate-slide-in border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{detailClient.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span
                className={`font-semibold uppercase ${
                  detailClient.status === 'ativo'
                    ? 'text-emerald-700'
                    : detailClient.status === 'vencido'
                      ? 'text-red-600'
                      : 'text-slate-600'
                }`}
              >
                {detailClient.status}
              </span>
              {detailClient.label_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600">{detailClient.label_name}</span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Contact Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</h3>
            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400" />
                {detailClient.phone ? (
                  <a
                    href={getPhoneLink(detailClient.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono tabular-nums text-sm hover:text-emerald-600 transition-colors"
                  >
                    {detailClient.phone}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">Sem telefone</span>
                )}
              </div>
              {detailClient.phone && (
                <a
                  href={getPhoneLink(detailClient.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
                </a>
              )}
            </div>
            {detailClient.email && (
              <div className="flex items-center gap-2.5 text-slate-700 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${detailClient.email}`} className="hover:text-blue-600 transition-colors">
                  {detailClient.email}
                </a>
              </div>
            )}
            {detailClient.address && (
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-sm">{detailClient.address}</span>
              </div>
            )}
          </div>

          {/* Plan Details Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhes do Plano</h3>
              {detailClient.plan_type !== 'vitalicio' && (
                <button
                  onClick={() => setShowRenewModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Confirmar renovação
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Tipo e Valor</span>
                <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="capitalize">{detailClient.plan_type}</span> ·{' '}
                  <span className="font-mono tabular-nums">{formatCurrency(detailClient.plan_value)}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Vigência</span>
                <div className="text-xs font-mono tabular-nums text-slate-700 space-y-0.5">
                  <div>Ativação: {formatDate(detailClient.activation_date)}</div>
                  {detailClient.plan_type !== 'vitalicio' && (
                    <div className={detailClient.status === 'vencido' ? 'text-red-600 font-semibold' : ''}>
                      Vence: {formatDate(detailClient.expiration_date)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Renewals History */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Renovações registradas</h3>
            {renewals.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma renovação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {renewals.map((renewal) => (
                  <div
                    key={renewal.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        Ciclo {renewal.renewal_year} ({renewal.plan_type})
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500">
                        Renovado em {formatDate(renewal.renewed_at)}
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono tabular-nums text-slate-700">
                      <div className="text-[11px] font-sans text-slate-400">Novo vencimento</div>
                      <div className="font-semibold">{formatDate(renewal.new_expiration_date || '')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device & Notes Card */}
          {(detailClient.device_info || detailClient.notes) && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              {detailClient.device_info && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" /> Dispositivo / App
                  </h3>
                  <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {detailClient.device_info}
                  </p>
                </div>
              )}
              {detailClient.notes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observações</h3>
                  <p className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap">
                    {detailClient.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Interaction History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Histórico de Atendimento</h3>
              <button
                onClick={() => setShowInteractionForm(!showInteractionForm)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Nova Interação
              </button>
            </div>

            {showInteractionForm && (
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 animate-fade-in">
                <div className="flex gap-1.5 mb-3">
                  {(['whatsapp', 'ligacao', 'visita', 'anotacao'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewInteraction({ ...newInteraction, type })}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                        newInteraction.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newInteraction.description}
                  onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })}
                  placeholder="Detalhes da interação..."
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-2 bg-white"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInteractionForm(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-blue-100 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInteraction}
                    disabled={loading || !newInteraction.description.trim()}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Salvar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {interactions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  Nenhuma interação registrada.
                </div>
              ) : (
                interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                      <InteractionIcon type={interaction.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800 uppercase">{interaction.type}</span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {formatDate(interaction.created_at, true)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 break-words">{interaction.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <RenewalModal
        client={detailClient}
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        onSuccess={() => void refreshClientData()}
      />
    </>
  );
}
