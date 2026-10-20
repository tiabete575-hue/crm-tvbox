'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tags, Plus, Pencil, Trash2, X, Check, Loader2, ShieldAlert } from 'lucide-react';
import type { Label } from '@/lib/types';
import { useToast } from '@/components/Toast';

export default function LabelsPage() {
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const [newLabel, setNewLabel] = useState({ name: '', color: '#2563eb' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', color: '' });
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/labels', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
      }
    } catch {
      error('Erro ao carregar etiquetas.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;

    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLabel),
      });

      if (!res.ok) throw new Error();

      success('Etiqueta criada com sucesso!');
      setNewLabel({ name: '', color: '#2563eb' });
      void fetchLabels();
    } catch {
      error('Erro ao criar etiqueta.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editData.name.trim()) return;

    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error();

      success('Etiqueta atualizada!');
      setEditingId(null);
      void fetchLabels();
    } catch {
      error('Erro ao atualizar etiqueta.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!labelToDelete) return;

    try {
      const res = await fetch(`/api/labels/${labelToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Falha ao excluir');
      }

      success('Etiqueta excluída!');
      void fetchLabels();
    } catch (err: any) {
      error(err.message || 'Não é possível excluir etiquetas em uso.');
    } finally {
      setLabelToDelete(null);
    }
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditData({ name: label.name, color: label.color });
  };

  const colorOptions = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
    '#06b6d4', '#0ea5e9', '#2563eb', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b',
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Etiquetas</h1>
          <p className="text-sm text-slate-500">Organize e filtre seus clientes por mês de vencimento ou perfil</p>
        </div>
      </div>

      {/* Create New Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Nova Etiqueta</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Etiqueta</label>
            <input
              type="text"
              required
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cliente VIP, Indicado, Servidor 2..."
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newLabel.color}
                onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                className="w-9 h-9 p-1 border border-slate-300 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1 overflow-x-auto max-w-[200px] py-1">
                {colorOptions.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabel({ ...newLabel, color: c })}
                    className={`w-6 h-6 rounded-full shrink-0 border-2 ${
                      newLabel.color === c ? 'border-slate-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newLabel.name.trim()}
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : labels.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
          Nenhuma etiqueta criada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {labels.map((label) => (
            <div
              key={label.id}
              role={editingId === label.id ? undefined : 'link'}
              tabIndex={editingId === label.id ? undefined : 0}
              aria-label={editingId === label.id ? undefined : `Ver clientes da etiqueta ${label.name}`}
              onClick={() => editingId !== label.id && router.push(`/clientes?label=${label.id}`)}
              onKeyDown={(event) => {
                if (editingId !== label.id && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  router.push(`/clientes?label=${label.id}`);
                }
              }}
              className={`bg-white rounded-xl border border-slate-200 p-4 group transition-all ${
                editingId === label.id
                  ? ''
                  : 'cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {editingId === label.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    autoFocus
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="color"
                      value={editData.color}
                      onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                      className="w-8 h-8 p-0.5 border border-slate-200 rounded cursor-pointer"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(label.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-semibold text-sm text-slate-900 break-words">{label.name}</span>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {label.client_count || 0} clientes
                    </span>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(label);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar etiqueta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLabelToDelete(label);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir etiqueta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {labelToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold">Excluir Etiqueta</h3>
            </div>
            <p className="text-sm text-slate-600">
              Deseja excluir a etiqueta <strong>{labelToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLabelToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
