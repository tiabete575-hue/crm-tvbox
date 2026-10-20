'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  ShieldAlert,
  Loader2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Label } from '@/lib/types';
import { useToast } from '@/components/Toast';
import ClientModal from '@/components/ClientModal';
import ClientDetailPanel from '@/components/ClientDetailPanel';
import RenewalModal from '@/components/RenewalModal';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Panels
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToRenew, setClientToRenew] = useState<Client | null>(null);

  const { success, error } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, labelsRes] = await Promise.all([
        fetch('/api/clients', { cache: 'no-store' }),
        fetch('/api/labels', { cache: 'no-store' }),
      ]);

      if (!clientsRes.ok || !labelsRes.ok) throw new Error('Falha ao buscar dados');

      const clientsData = await clientsRes.json();
      const labelsData = await labelsRes.json();

      setClients(clientsData);
      setLabels(labelsData);
    } catch (err) {
      error('Erro ao carregar clientes. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    const labelFromUrl = new URLSearchParams(window.location.search).get('label');
    if (labelFromUrl) setFilterLabel(labelFromUrl);
    void fetchData();
  }, [fetchData]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter((client) => {
      const matchSearch =
        client.name.toLowerCase().includes(term) ||
        (client.phone || '').toLowerCase().includes(term) ||
        (client.email || '').toLowerCase().includes(term) ||
        (client.device_info || '').toLowerCase().includes(term);
      const matchPlan = filterPlan ? client.plan_type === filterPlan : true;
      const matchStatus = filterStatus ? client.status === filterStatus : true;
      const matchLabel = filterLabel ? client.label_id?.toString() === filterLabel : true;

      return matchSearch && matchPlan && matchStatus && matchLabel;
    });
  }, [clients, searchTerm, filterPlan, filterStatus, filterLabel]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const paginatedClients = filteredClients.slice(pageStart, pageStart + pageSize);

  const handleOpenModal = (client?: Client) => {
    setSelectedClient(client || null);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleSaveClient = async () => {
    await fetchData();
    setIsModalOpen(false);
    success(selectedClient ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      const res = await fetch(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');

      setClients(clients.filter((c) => c.id !== clientToDelete.id));
      success('Cliente excluído com sucesso!');
    } catch {
      error('Erro ao excluir cliente.');
    } finally {
      setClientToDelete(null);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getPhoneLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Carteira de Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie seus assinantes, aparelhos vinculados e ciclos de renovação
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email ou aparelho/MAC..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <select
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            value={filterPlan}
            onChange={(e) => {
              setFilterPlan(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todos os Planos</option>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
            <option value="vitalicio">Vitalício</option>
          </select>
          <select
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
            value={filterLabel}
            onChange={(e) => {
              setFilterLabel(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todas as Etiquetas</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <UserPlus className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Nenhum cliente encontrado</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-4">
              {clients.length === 0
                ? 'Você ainda não possui clientes cadastrados. Clique no botão "Novo Cliente" para começar.'
                : 'Nenhum cliente corresponde aos filtros aplicados.'}
            </p>
            {clients.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPlan('');
                  setFilterStatus('');
                  setFilterLabel('');
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-600 font-semibold hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 whitespace-nowrap">Assinante / Aparelho</th>
                  <th className="py-3 px-4 whitespace-nowrap">Contato</th>
                  <th className="py-3 px-4 whitespace-nowrap">Plano & Valor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Vigência</th>
                  <th className="py-3 px-4 whitespace-nowrap">Situação</th>
                  <th className="py-3 px-4 whitespace-nowrap">Etiqueta</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                      handleOpenDetail(client);
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      {client.device_info ? (
                        <div className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[220px] mt-0.5">
                          <Monitor className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.device_info}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">
                          {client.email || 'Sem aparelho registrado'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={client.phone ? getPhoneLink(client.phone) : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-600 transition-colors font-mono tabular-nums text-xs"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{client.phone || 'Sem telefone'}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <div className="capitalize text-sm font-medium text-slate-800">{client.plan_type}</div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        {formatCurrency(client.plan_value)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600">
                      <div>
                        <span className="text-slate-400 font-sans">Ativa:</span> {formatDate(client.activation_date)}
                      </div>
                      {client.plan_type !== 'vitalicio' && (
                        <div>
                          <span className="text-slate-400 font-sans">Vence:</span>{' '}
                          <span className={client.status === 'vencido' ? 'text-red-600 font-semibold' : ''}>
                            {formatDate(client.expiration_date)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          client.plan_type === 'vitalicio'
                            ? 'text-emerald-700'
                            : client.status === 'ativo'
                              ? 'text-emerald-700'
                              : client.status === 'vencido'
                                ? 'text-red-600'
                                : 'text-slate-500'
                        }`}
                      >
                        {client.plan_type === 'vitalicio'
                          ? 'Vitalício'
                          : client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {client.label_name ? (
                        <span className="text-xs font-medium text-slate-700">{client.label_name}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        {client.plan_type !== 'vitalicio' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClientToRenew(client);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Confirmar renovação"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(client);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredClients.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
              <span>
                Exibindo <strong>{pageStart + 1}</strong>–
                <strong>{Math.min(pageStart + pageSize, filteredClients.length)}</strong> de{' '}
                <strong>{filteredClients.length}</strong>
              </span>
              <label className="flex items-center gap-2 font-sans">
                <span className="sr-only">Clientes por página</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Clientes por página"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="min-w-[92px] text-center text-xs font-mono tabular-nums text-slate-600">
                Página <strong>{activePage}</strong> de <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-slide-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete.name}</strong>? Esta ação não pode ser
              desfeita e removerá todo o histórico associado.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveClient}
          client={selectedClient || undefined}
          labels={labels}
        />
      )}

      {selectedClient && isDetailOpen && (
        <ClientDetailPanel
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onUpdate={fetchData}
        />
      )}

      <RenewalModal
        client={clientToRenew}
        isOpen={Boolean(clientToRenew)}
        onClose={() => setClientToRenew(null)}
        onSuccess={() => void fetchData()}
      />
    </div>
  );
}
