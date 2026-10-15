'use client';

import { useState, useEffect } from 'react';
import { 
  X, Phone, Mail, MapPin, CalendarCheck, CreditCard, Monitor, 
  MessageCircle, PhoneCall, Home, FileText, Send, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Interaction, Renewal } from '@/lib/types';
import { useToast } from '@/components/Toast';

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
  const [renewing, setRenewing] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const { success, error } = useToast();
  
  const [newInteraction, setNewInteraction] = useState({
    type: 'whatsapp' as Interaction['type'],
    description: ''
  });

  const fetchInteractions = async () => {
    try {
      const res = await fetch(`/api/interactions/${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setInteractions(data);
      }
    } catch (err) {
      console.error('Failed to fetch interactions', err);
    }
  };

  const fetchRenewals = async () => {
    try {
      const res = await fetch(`/api/renewals/${client.id}`);
      if (res.ok) setRenewals(await res.json());
    } catch (err) {
      console.error('Failed to fetch renewals', err);
    }
  };

  useEffect(() => {
    if (isOpen && client.id) {
      setDetailClient(client);
      fetchInteractions();
      fetchRenewals();
    }
  }, [isOpen, client.id]);

  const handleRenew = async () => {
    if (!confirm(`Confirmar a renovação de ${detailClient.name} a partir de hoje?`)) return;
    setRenewing(true);
    try {
      const res = await fetch('/api/clients/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailClient.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao renovar');
      setDetailClient({ ...detailClient, ...data });
      await Promise.all([fetchRenewals(), fetchInteractions(), onUpdate()]);
      success(`Renovação de ${new Date().getFullYear()} registrada!`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao renovar plano.');
    } finally {
      setRenewing(false);
    }
  };

  const handleSaveInteraction = async () => {
    if (!newInteraction.description.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          ...newInteraction
        })
      });
      
      if (!res.ok) throw new Error();
      
      success('Interação salva com sucesso!');
      setNewInteraction({ type: 'whatsapp', description: '' });
      setShowInteractionForm(false);
      fetchInteractions();
    } catch (err) {
      error('Erro ao salvar interação.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string, includeTime = false) => {
    if (!dateStr) return '-';
    try {
      const formatStr = includeTime ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy';
      return format(parseISO(dateStr), formatStr, { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getPhoneLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

  const InteractionIcon = ({ type }: { type: Interaction['type'] }) => {
    switch (type) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'ligacao': return <PhoneCall className="w-4 h-4 text-blue-500" />;
      case 'visita': return <Home className="w-4 h-4 text-amber-500" />;
      case 'anotacao': return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-slide-in border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{detailClient.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                detailClient.status === 'ativo' ? 'bg-green-100 text-green-800' :
                detailClient.status === 'vencido' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {detailClient.status.toUpperCase()}
              </span>
              {client.label_name && (
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: `${client.label_color}20`, color: client.label_color }}
                >
                  {client.label_name}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Contact Card */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Contato</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <Phone className="w-5 h-5 text-slate-400" />
              {client.phone ? <a href={getPhoneLink(client.phone)} target="_blank" rel="noreferrer" className="hover:text-green-600 transition-colors">{client.phone}</a> : <span>Sem telefone</span>}
            </div>
            {client.email && (
              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="w-5 h-5 text-slate-400" />
                <a href={`mailto:${client.email}`} className="hover:text-blue-600 transition-colors">{client.email}</a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3 text-slate-700">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-sm">{client.address}</span>
              </div>
            )}
          </div>

          {/* Plan Details Card */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <div className="space-y-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Detalhes do Plano</h3>
              {detailClient.plan_type !== 'vitalicio' && (
                <button
                  onClick={handleRenew}
                  disabled={renewing}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                >
                  {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />}
                  Marcar como renovado
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Tipo e Valor</span>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <span className="capitalize">{detailClient.plan_type}</span> - {formatCurrency(detailClient.plan_value)}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Datas</span>
                <div className="text-sm text-slate-700">
                  <div>Ativação: {formatDate(detailClient.activation_date)}</div>
                  {detailClient.plan_type !== 'vitalicio' && (
                    <div className={detailClient.status === 'vencido' ? 'text-red-600 font-medium' : ''}>
                      Vencimento: {formatDate(detailClient.expiration_date)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Renovações registradas</h3>
            {renewals.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma renovação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {renewals.map((renewal) => (
                  <div key={renewal.id} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-emerald-800">Renovou em {renewal.renewal_year}</div>
                      <div className="text-xs text-emerald-700">Registrado em {formatDate(renewal.renewed_at)}</div>
                    </div>
                    <div className="text-right text-xs text-emerald-700">
                      <div>Novo vencimento</div>
                      <div className="font-semibold">{formatDate(renewal.new_expiration_date || '')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device & Notes Card */}
          {(client.device_info || client.notes) && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
              {client.device_info && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Dispositivo
                  </h3>
                  <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{client.device_info}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Observações</h3>
                  <p className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Interaction History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Histórico</h3>
              <button 
                onClick={() => setShowInteractionForm(!showInteractionForm)}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                + Nova Interação
              </button>
            </div>

            {/* Inline Interaction Form */}
            {showInteractionForm && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fade-in">
                <div className="flex gap-2 mb-3">
                  {(['whatsapp', 'ligacao', 'visita', 'anotacao'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewInteraction({ ...newInteraction, type })}
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                        newInteraction.type === type 
                          ? 'bg-blue-600 text-white shadow-sm' 
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
                    onClick={() => setShowInteractionForm(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-blue-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveInteraction}
                    disabled={loading || !newInteraction.description.trim()}
                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {interactions.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  Nenhuma interação registrada.
                </div>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-white text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10">
                      <InteractionIcon type={interaction.type} />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm ml-14 md:ml-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 uppercase">{interaction.type}</span>
                        <span className="text-xs text-slate-400">{formatDate(interaction.created_at, true)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{interaction.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
