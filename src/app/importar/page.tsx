'use client';

import { useState, useRef } from 'react';
import { UploadCloud, Download, Database, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function ImportExportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  // Import Handling
  const processFile = async (file: File) => {
    if (!file) return;
    
    if (file.name.endsWith('.json')) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setImportData(data);
          setPreviewData(data.slice(0, 5));
        }
        else throw new Error();
      } catch {
        error('Arquivo JSON inválido.');
      }
    } else if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length > 1) {
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        const aliases: Record<string, string> = {
          nome: 'name', telefone: 'phone', plano: 'plan_type', valor: 'plan_value',
          data_ativacao: 'activation_date', data_vencimento: 'expiration_date',
          observacoes: 'notes', dispositivo: 'device_info', etiqueta: 'label_name'
        };
        const data = lines.slice(1).map(line => {
          const values = line.split(separator);
          const obj: any = {};
          headers.forEach((h, i) => { obj[aliases[h] || h] = values[i]?.trim().replace(/^"|"$/g, ''); });
          return obj;
        }).filter(row => row.name && row.phone);
        setImportData(data);
        setPreviewData(data.slice(0, 5));
      } else {
        error('Arquivo CSV vazio ou inválido.');
      }
    } else {
      error('Apenas arquivos .csv e .json são aceitos.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      error('Selecione um arquivo primeiro.');
      return;
    }

    setImporting(true);
    try {
      // In a real scenario, this endpoint parses the CSV/JSON and saves to DB
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na importação');
      
      success(`${data.count} clientes importados com sucesso!`);
      setPreviewData([]);
      setImportData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao importar clientes.');
    } finally {
      setImporting(false);
    }
  };

  // Export Handling
  const handleExport = async (type: 'json' | 'csv' | 'backup') => {
    setExporting(type);
    try {
      const format = type === 'backup' ? 'json' : type;
      const res = await fetch(`/api/clients/export?format=${format}`);
      if (!res.ok) throw new Error('Não foi possível gerar o arquivo');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = type === 'backup' ? 'backup-crm.json' : `clientes.${format}`;
      anchor.click();
      URL.revokeObjectURL(href);
      success(`Exportação ${type.toUpperCase()} concluída!`);
    } catch (err) {
      error('Erro ao exportar dados.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Importar & Exportar</h1>
        <p className="text-slate-500 mt-1">Gerencie os dados do seu sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Import Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Importar Clientes</h2>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
            <p className="text-slate-700 font-medium mb-1">Arraste um arquivo CSV ou JSON</p>
            <p className="text-sm text-slate-500 mb-4">ou clique para selecionar</p>
            <input 
              type="file" 
              accept=".csv,.json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileInput}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              Selecionar Arquivo
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600">
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" /> Colunas esperadas no CSV:
            </h4>
            <code className="bg-slate-200 px-2 py-1 rounded text-xs">nome, telefone, plano, valor, data_ativacao</code>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Pré-visualização (5 linhas)
              </h4>
              <div className="overflow-x-auto text-sm border border-slate-200 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys(previewData[0]).map(k => (
                        <th key={k} className="p-2 border-b font-medium text-slate-600">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} className="p-2 text-slate-700">{v?.toString().substring(0, 30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                Confirmar Importação
              </button>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 h-fit">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Exportar Dados</h2>
          </div>

          <p className="text-sm text-slate-600">
            Exporte seus clientes para uso em outras ferramentas ou para backup de segurança.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-slate-700 group-hover:text-emerald-700">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                <div className="text-left">
                  <div className="font-medium">Exportar como CSV</div>
                  <div className="text-xs text-slate-500">Abre no Excel, Planilhas do Google</div>
                </div>
              </div>
              {exporting === 'csv' ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />}
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-slate-700 group-hover:text-blue-700">
                <FileJson className="w-6 h-6 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Exportar como JSON</div>
                  <div className="text-xs text-slate-500">Formato original para desenvolvedores</div>
                </div>
              </div>
              {exporting === 'json' ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />}
            </button>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => handleExport('backup')}
                disabled={exporting !== null}
                className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-slate-300" />
                  <div className="text-left">
                    <div className="font-medium">Fazer Backup Completo</div>
                    <div className="text-xs text-slate-400">Clientes, etiquetas e histórico (.zip)</div>
                  </div>
                </div>
                {exporting === 'backup' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
