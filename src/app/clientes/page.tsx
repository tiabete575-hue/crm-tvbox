'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Pencil, Trash2, MessageCircle, ShieldAlert, Loader2, UserPlus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Label } from '@/lib/types';
import { useToast } from '@/components/Toast';
import ClientModal from '@/components/ClientModal';
import ClientDetailPanel from '@/components/ClientDetailPanel';

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

  const { success, error } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsRes, labelsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/labels')
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
  };

  useEffect(() => {
    const labelFromUrl = new URLSearchParams(window.location.search).get('label');
    if (labelFromUrl) setFilterLabel(labelFromUrl);
    fetchData();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (client.phone || '').includes(searchTerm) ||
                          (client.email || '').toLowerCase().includes(searchTerm.toLowerCase());
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
      
      setClients(clients.filter(c => c.id !== clientToDelete.id));
      success('Cliente excluído com sucesso!');
    } catch (err) {
      error('Erro ao excluir cliente.');
    } finally {
      setClientToDelete(null);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
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
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie seus assinantes e planos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4">
          <select 
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            value={filterPlan} onChange={(e) => { setFilterPlan(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos os Planos</option>
            <option value="anual">Anual</option>
            <option value="semestral">Semestral</option>
            <option value="vitalicio">Vitalício</option>
          </select>
          <select 
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select 
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
            value={filterLabel} onChange={(e) => { setFilterLabel(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todas as Etiquetas</option>
            {labels.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              {clients.length === 0 
                ? 'Você ainda não possui clientes cadastrados. Clique no botão "Novo Cliente" para começar.'
                : 'Nenhum cliente corresponde aos filtros aplicados.'}
            </p>
            {clients.length > 0 && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterPlan(''); setFilterStatus(''); setFilterLabel(''); setCurrentPage(1); }}
                className="text-blue-600 font-medium hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                  <th className="py-3 px-4 whitespace-nowrap">Nome</th>
                  <th className="py-3 px-4 whitespace-nowrap">Contato</th>
                  <th className="py-3 px-4 whitespace-nowrap">Plano</th>
                  <th className="py-3 px-4 whitespace-nowrap">Datas</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Etiqueta</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={(e) => {
                    // Prevent row click if clicking action buttons
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                    handleOpenDetail(client);
                  }}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{client.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[150px]">{client.email || 'Sem email'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <a 
                        href={client.phone ? getPhoneLink(client.phone) : '#'} 
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-green-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{client.phone || 'Sem telefone'}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <div className="capitalize text-sm font-medium text-slate-700">{client.plan_type}</div>
                      <div className="text-xs text-slate-500">{formatCurrency(client.plan_value)}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      <div><span className="text-slate-400">Ativa:</span> {formatDate(client.activation_date)}</div>
                      {client.plan_type !== 'vitalicio' && (
                        <div><span className="text-slate-400">Vence:</span> <span className={client.status === 'vencido' ? 'text-red-600 font-medium' : ''}>{formatDate(client.expiration_date)}</span></div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        client.plan_type === 'vitalicio' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        client.status === 'ativo' ? 'bg-green-50 text-green-700 border-green-200' :
                        client.status === 'vencido' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {client.plan_type === 'vitalicio' ? 'Vitalício' : client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {client.label_name ? (
                        <span 
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium opacity-90"
                          style={{ backgroundColor: `${client.label_color}20`, color: client.label_color, border: `1px solid ${client.label_color}40` }}
                        >
                          {client.label_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>
                Exibindo <strong>{pageStart + 1}</strong>–<strong>{Math.min(pageStart + pageSize, filteredClients.length)}</strong> de <strong>{filteredClients.length}</strong>
              </span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Clientes por página</span>
                <select
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="min-w-[92px] text-center text-sm text-slate-600">
                Página <strong>{activePage}</strong> de <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-slide-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ShieldAlert className="w-8 h-8" />
              <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete.name}</strong>? 
              Esta ação não pode ser desfeita e removerá todo o histórico associado.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
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
          onClose={() => { setIsDetailOpen(false); setSelectedClient(null); }}
          client={selectedClient}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
