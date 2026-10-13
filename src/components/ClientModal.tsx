'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { format, addMonths, addYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Label } from '@/lib/types';
import { useToast } from '@/components/Toast';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  client?: Client;
  labels: Label[];
}

export default function ClientModal({ isOpen, onClose, onSave, client, labels }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const { error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    plan_type: 'anual',
    plan_value: '',
    activation_date: format(new Date(), 'yyyy-MM-dd'),
    label_id: '',
    device_info: '',
    notes: ''
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        plan_type: client.plan_type || 'anual',
        plan_value: client.plan_value?.toString() || '',
        activation_date: client.activation_date ? client.activation_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
        label_id: client.label_id?.toString() || '',
        device_info: client.device_info || '',
        notes: client.notes || ''
      });
    }
  }, [client]);

  if (!isOpen) return null;

  // Calculate expiration preview
  let expirationPreview = '-';
  if (formData.activation_date && formData.plan_type !== 'vitalicio') {
    try {
      const activeDate = parseISO(formData.activation_date);
      let expDate;
      if (formData.plan_type === 'anual') expDate = addYears(activeDate, 1);
      else if (formData.plan_type === 'semestral') expDate = addMonths(activeDate, 6);
      
      if (expDate) {
        expirationPreview = format(expDate, 'dd/MM/yyyy', { locale: ptBR });
      }
    } catch (e) {
      // ignore
    }
  } else if (formData.plan_type === 'vitalicio') {
    expirationPreview = 'Vitalício (Nunca expira)';
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      error('Nome e Telefone são obrigatórios.');
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        plan_value: parseFloat(formData.plan_value) || 0,
        label_id: formData.label_id ? parseInt(formData.label_id) : null
      };

      const url = client ? `/api/clients/${client.id}` : '/api/clients';
      const method = client ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Falha ao salvar cliente');
      }

      onSave();
    } catch (err: any) {
      error(err.message || 'Erro ao salvar cliente. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dados Pessoais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <input
                    type="text" name="name" required
                    value={formData.name} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nome completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone *</label>
                  <input
                    type="text" name="phone" required
                    value={formData.phone} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email" name="email"
                    value={formData.email} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                  <input
                    type="text" name="address"
                    value={formData.address} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Rua, Número, Bairro, Cidade"
                  />
                </div>
              </div>

              {/* Plan Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dados do Plano</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Plano</label>
                  <select
                    name="plan_type"
                    value={formData.plan_type} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="anual">Anual</option>
                    <option value="semestral">Semestral</option>
                    <option value="vitalicio">Vitalício</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Plano (R$)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="number" step="0.01" name="plan_value" min="0"
                      value={formData.plan_value} onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Ativação</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="date" name="activation_date" required
                      value={formData.activation_date} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col">
                  <span className="text-xs text-blue-600 font-medium">Vencimento Calculado:</span>
                  <span className="text-sm font-semibold text-blue-800">{expirationPreview}</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Etiqueta</label>
                  <select
                    name="label_id"
                    value={formData.label_id} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Nenhuma etiqueta</option>
                    {labels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Informações Adicionais</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Info do Dispositivo (TV Box, MAC, etc)</label>
                  <input
                    type="text" name="device_info"
                    value={formData.device_info} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ex: MXQ Pro 4K, MAC: 00:00:00:00:00:00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea
                    name="notes" rows={3}
                    value={formData.notes} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Anotações gerais sobre o cliente..."
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="client-form"
            className="px-6 py-2 font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center min-w-[120px] shadow-sm"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
