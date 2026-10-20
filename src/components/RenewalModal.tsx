'use client';

import { useState, useEffect } from 'react';
import { X, CalendarCheck, Wallet, Loader2, ArrowRight } from 'lucide-react';
import { addMonths, format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/Toast';

export interface RenewableClient {
  id: number | string;
  name: string;
  phone?: string | null;
  plan_type: string;
  plan_value: number;
  expiration_date?: string | null;
}

interface RenewalModalProps {
  client: RenewableClient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_MONTHS: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

const todaySp = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export default function RenewalModal({ client, isOpen, onClose, onSuccess }: RenewalModalProps) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  const [renewDate, setRenewDate] = useState(todaySp());
  const [planType, setPlanType] = useState('anual');
  const [planValue, setPlanValue] = useState('');
  const [notes, setNotes] = useState('');

  const [registerPayment, setRegisterPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'transferencia' | 'outro'>('pix');
  const [paymentPaid, setPaymentPaid] = useState(true);

  useEffect(() => {
    if (client && isOpen) {
      const defaultDate = todaySp();
      setRenewDate(defaultDate);
      setPlanType(client.plan_type === 'vitalicio' ? 'anual' : client.plan_type || 'anual');
      const val = Number(client.plan_value || 0);
      setPlanValue(val > 0 ? String(val) : '');
      setPaymentAmount(val > 0 ? String(val) : '');
      setPaymentMethod('pix');
      setPaymentPaid(true);
      setRegisterPayment(val > 0);
      setNotes('');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  let newExpirationPreview = '-';
  try {
    const base = parseISO(renewDate);
    if (isValid(base)) {
      const months = PLAN_MONTHS[planType] || 12;
      newExpirationPreview = format(addMonths(base, months), 'dd/MM/yyyy', { locale: ptBR });
    }
  } catch {
    newExpirationPreview = '-';
  }

  const prevExpFormatted = (() => {
    if (!client.expiration_date) return 'Sem data';
    try {
      return format(parseISO(client.expiration_date.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return client.expiration_date.slice(0, 10);
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const numericPlanValue = parseFloat(planValue) || 0;
      const numericPayAmount = parseFloat(paymentAmount) || numericPlanValue;

      const res = await fetch('/api/clients/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          renewed_at: renewDate,
          plan_type: planType,
          plan_value: numericPlanValue,
          notes: notes.trim() || null,
          register_payment: registerPayment && numericPayAmount > 0,
          payment_amount: numericPayAmount,
          payment_method: paymentMethod,
          payment_paid: paymentPaid,
          payment_description: `Renovação ${planType} - ${client.name}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível confirmar a renovação.');
      }

      success(
        registerPayment && numericPayAmount > 0
          ? `Plano de ${client.name} renovado e financeiro registrado!`
          : `Plano de ${client.name} renovado com sucesso!`
      );
      onSuccess();
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao renovar assinatura.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar renovação"
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-fade-in"
      >
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Confirmar Renovação</h2>
              <p className="text-xs text-slate-500">{client.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Date transition summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Vencimento anterior</span>
              <span className="font-mono tabular-nums font-semibold text-slate-700">{prevExpFormatted}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="text-right">
              <span className="text-xs text-blue-600 font-medium block">Novo vencimento</span>
              <span className="font-mono tabular-nums font-bold text-blue-700">{newExpirationPreview}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data da renovação</label>
              <input
                aria-label="Data da renovação"
                type="date"
                required
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ciclo do Plano</label>
              <select
                aria-label="Ciclo do Plano"
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="mensal">Mensal (1 mês)</option>
                <option value="trimestral">Trimestral (3 meses)</option>
                <option value="semestral">Semestral (6 meses)</option>
                <option value="anual">Anual (12 meses)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor do Plano (R$)</label>
              <input
                aria-label="Valor do Plano"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={planValue}
                onChange={(e) => {
                  setPlanValue(e.target.value);
                  setPaymentAmount(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Integrated Financial Launch */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/60">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Lançar pagamento no Financeiro agora
              </span>
              <input
                type="checkbox"
                checked={registerPayment}
                onChange={(e) => setRegisterPayment(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            {registerPayment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor a lançar (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required={registerPayment}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ex: 150.00"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="transferencia">Transferência</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={paymentPaid}
                    onChange={(e) => setPaymentPaid(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Já recebido na data da renovação (desmarque para deixar como cobrança pendente)
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Observação da renovação (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante enviado no WhatsApp..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
            Confirmar renovação
          </button>
        </div>
      </form>
    </div>
  );
}
