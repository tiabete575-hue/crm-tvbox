'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tags, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import type { Label } from '@/lib/types';
import { useToast } from '@/components/Toast';

export default function LabelsPage() {
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const [newLabel, setNewLabel] = useState({ name: '', color: '#3b82f6' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', color: '' });

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
      }
    } catch (err) {
      error('Erro ao carregar etiquetas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;

    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLabel)
      });

      if (!res.ok) throw new Error();

      success('Etiqueta criada com sucesso!');
      setNewLabel({ name: '', color: '#3b82f6' });
      fetchLabels();
    } catch (err) {
      error('Erro ao criar etiqueta.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editData.name.trim()) return;

    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (!res.ok) throw new Error();

      success('Etiqueta atualizada!');
      setEditingId(null);
      fetchLabels();
    } catch (err) {
      error('Erro ao atualizar etiqueta.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta etiqueta?')) return;

    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Falha ao excluir');
      }

      success('Etiqueta excluída!');
      fetchLabels();
    } catch (err: any) {
      error(err.message || 'Não é possível excluir etiquetas em uso.');
    }
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditData({ name: label.name, color: label.color });
  };

  const colorOptions = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b'
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Tags className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Etiquetas</h1>
          <p className="text-slate-500">Organize e categorize seus clientes</p>
        </div>
      </div>

      {/* Create New Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Nova Etiqueta</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome da Etiqueta</label>
            <input
              type="text" required
              value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Cliente VIP, Indicado, Promessa..."
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-slate-500 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newLabel.color} onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                className="w-10 h-10 p-1 border border-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1 overflow-x-auto max-w-[200px] hide-scrollbar py-1">
                {colorOptions.slice(0, 8).map(c => (
                  <button 
                    key={c} type="button" 
                    onClick={() => setNewLabel({ ...newLabel, color: c })}
                    className={`w-6 h-6 rounded-full shrink-0 border-2 ${newLabel.color === c ? 'border-slate-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button 
            type="submit"
            disabled={!newLabel.name.trim()}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" /> Adicionar
          </button>
        </form>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : labels.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-100 border-dashed">
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
              className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm group transition-all ${
                editingId === label.id
                  ? ''
                  : 'cursor-pointer hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {editingId === label.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <input
                    type="text" autoFocus
                    value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="color"
                      value={editData.color} onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                      className="w-8 h-8 p-0.5 border border-slate-200 rounded cursor-pointer"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleUpdate(label.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: label.color }} />
                      <span className="font-medium text-slate-800 break-words">{label.name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                      {label.client_count || 0} clientes
                    </span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(event) => { event.stopPropagation(); startEdit(label); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar etiqueta">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDelete(label.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir etiqueta">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
