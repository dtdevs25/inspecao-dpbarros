import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Download, Sparkles, Loader2, ChevronDown, ChevronUp, Users, Calendar, ClipboardList } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from '../lib/dbBridge';
const db = {} as any;
import { useUser } from '../contexts/UserContext';
import { uploadFile } from '../lib/upload';
import { compressImage } from '../lib/utils';
import { TECHNICAL_CHECKLIST, ChecklistAnswers, DEFAULT_CHECKLIST_ANSWERS, ALL_CHECKLIST_ITEMS } from '../constants/technicalChecklist';
import { SignaturePad } from './SignaturePad';

const SESMT_FIELDS = [
  { key: 'pgr',          label: 'PGR' },
  { key: 'integracao',   label: 'INTEGRACAO' },
  { key: 'fichaEpi',     label: "FICHA DE EPI's" },
  { key: 'treinamentos', label: 'TREINAMENTOS' },
  { key: 'dds',          label: 'DDS' },
  { key: 'apr',          label: 'APR (Analise Preliminar de Risco)' },
  { key: 'checkList',    label: 'CHECK LIST' },
] as const;

const DEFAULTS: Record<string, string> = {
  pgr: 'Entregue',
  integracao: 'Sendo realizada de acordo com padrao.',
  fichaEpi: 'Sendo realizada de acordo com padrao.',
  treinamentos: 'Sendo realizada de acordo com padrao.',
  dds: 'DDS realizado 1 vez por semana com diversos temas.',
  apr: 'Sendo realizada de acordo com padrao.',
  checkList: 'Sendo realizada de acordo com padrao.',
};

export default function TechnicalVisits() {
  const { user, profile } = useUser();
  const [visits, setVisits] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<number>(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const emptyForm = () => ({
    companyId: '', unitId: '', date: new Date().toISOString().split('T')[0],
    ...DEFAULTS,
    numberOfEmployees: '',
    finalNotes: '',
    inspectionIds: [] as string[],
    checklistAnswers: { ...DEFAULT_CHECKLIST_ANSWERS } as ChecklistAnswers,
    engineerResponsible: '',
    technicianResponsible: '',
    technicianSignature: null as string | null,
    engineerSignature: null as string | null,
  });
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'technical_visits'), orderBy('createdAt', 'desc')), s => { setVisits(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'companies'), s => setCompanies(s.docs.map(d => ({ id: d.id, name: d.data().name })))),
      onSnapshot(collection(db, 'units'), s => setUnits(s.docs.map(d => ({ id: d.id, companyId: d.data().companyId, name: d.data().name })))),
      onSnapshot(query(collection(db, 'inspections'), orderBy('createdAt', 'desc')), s => setInspections(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch { setSelectedFile(file); }
  };

  const toggleInspection = (id: string) => {
    setForm(prev => ({
      ...prev,
      inspectionIds: prev.inspectionIds.includes(id)
        ? prev.inspectionIds.filter(i => i !== id)
        : [...prev.inspectionIds, id],
    }));
  };

  const setAnswer = (itemId: string, val: 'C' | 'NC' | 'NA') => {
    setForm(prev => ({ ...prev, checklistAnswers: { ...prev.checklistAnswers, [itemId]: val } }));
  };

  const handleAIFill = async () => {
    if (!form.inspectionIds.length) { alert('Selecione ao menos uma inspecao para usar a IA.'); return; }
    setAiLoading(true);
    try {
      const selectedInspections = inspections.filter(i => form.inspectionIds.includes(i.id));
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/reports/technical-visit/auto-fill-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ inspections: selectedInspections, checklistItems: ALL_CHECKLIST_ITEMS }),
      });
      if (!res.ok) throw new Error('Erro na IA');
      const { answers } = await res.json();
      setForm(prev => ({ ...prev, checklistAnswers: { ...prev.checklistAnswers, ...answers } }));
    } catch (e) { alert('Falha no preenchimento via IA. Tente novamente.'); }
    finally { setAiLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const company = companies.find(c => c.id === form.companyId);
      const unit = units.find(u => u.id === form.unitId);
      const data: any = {
        ...form,
        companyName: company?.name || '',
        unitName: unit?.name || '',
        registeredBy: profile?.displayName || user?.email || '',
        registeredByUid: user?.uid || '',
        updatedAt: serverTimestamp(),
      };
      if (selectedFile) data.photoUrl = await uploadFile(selectedFile, 'foto-visita-dpbarros');
      else if (imagePreview) data.photoUrl = (form as any).photoUrl || imagePreview;

      const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
      };

      if (form.technicianSignature?.startsWith('data:image')) {
        const file = dataURLtoFile(form.technicianSignature, `tech-sig-${Date.now()}.png`);
        data.technicianSignature = await uploadFile(file, 'assinatura-dpbarros');
      }
      
      if (form.engineerSignature?.startsWith('data:image')) {
        const file = dataURLtoFile(form.engineerSignature, `eng-sig-${Date.now()}.png`);
        data.engineerSignature = await uploadFile(file, 'assinatura-dpbarros');
      }

      if (viewMode === 'edit' && selectedItem) {
        await updateDoc(doc(db, 'technical_visits', selectedItem.id), data);
      } else {
        await addDoc(collection(db, 'technical_visits'), { ...data, createdAt: serverTimestamp() });
      }
      setViewMode('list');
    } catch (err) { alert('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const openCreate = () => { setSelectedItem(null); setForm(emptyForm()); setImagePreview(null); setSelectedFile(null); setActiveSection(0); setViewMode('create'); };
  const openEdit = (v: any) => { setSelectedItem(v); setForm({ ...emptyForm(), ...v }); setImagePreview(v.photoUrl || null); setSelectedFile(null); setActiveSection(0); setViewMode('edit'); };

  const downloadPDF = async (id: string) => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/reports/technical-visit/${id}/pdf`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) { alert('Falha ao gerar PDF'); return; }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `relatorio_${id.substring(0,6)}.pdf`; a.click();
  };

  const sections = ['Dados Gerais', 'Documentacao SESMT', 'Inspecoes Vinculadas', 'Checklist NRs', 'Anotacoes Finais'];

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;

  if (viewMode === 'create' || viewMode === 'edit') {
    const filteredInspections = inspections.filter(i => (!form.companyId || i.companyId === form.companyId) && (!form.unitId || i.unitId === form.unitId));
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{viewMode === 'create' ? 'Nova Visita Técnica' : 'Editar Visita'}</h1>
          <button onClick={() => setViewMode('list')} className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-bold hover:bg-gray-300 transition-colors">Voltar</button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap">
          {sections.map((s, i) => (
            <button key={i} onClick={() => setActiveSection(i)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeSection === i ? 'bg-[#27AE60] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {/* Section 0: Dados Gerais */}
          {activeSection === 0 && (
            <div className="space-y-6">
              <h3 className="text-[#27AE60] font-bold text-lg">Dados Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Empresa *</label>
                  <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value, unitId: '' })}>
                    <option value="">Selecione...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Unidade *</label>
                  <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {units.filter(u => u.companyId === form.companyId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Data da Visita *</label>
                  <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Engenheiro(s) Responsável(eis)</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    placeholder="Nome(s) do(s) Engenheiro(s)"
                    value={form.engineerResponsible} onChange={e => setForm({ ...form, engineerResponsible: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Técnico(s) de Segurança Responsável(eis)</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                    placeholder="Nome(s) do(s) Técnico(s)"
                    value={form.technicianResponsible} onChange={e => setForm({ ...form, technicianResponsible: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Foto de Entrada da Obra (Capa)</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-2 border rounded-xl bg-gray-50" />
                {imagePreview && <img src={imagePreview} className="mt-3 h-40 object-cover rounded-xl shadow" alt="Preview" />}
              </div>
            </div>
          )}

          {/* Section 1: SESMT */}
          {activeSection === 1 && (
            <div className="space-y-4">
              <h3 className="text-[#27AE60] font-bold text-lg">Documentacao SESMT</h3>
              {SESMT_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{f.label} – Status</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    value={(form as any)[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Inspections */}
          {activeSection === 2 && (
            <div className="space-y-4">
              <h3 className="text-[#27AE60] font-bold text-lg">Inspecoes Vinculadas ({form.inspectionIds.length} selecionadas)</h3>
              <p className="text-sm text-gray-500">Selecione os apontamentos desta obra para incluir no relatorio fotografico.</p>
              {filteredInspections.length === 0 && <p className="text-gray-400 text-sm italic">Nenhuma inspecao encontrada para esta unidade.</p>}
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-xl p-3 bg-gray-50/50">
                {filteredInspections.map(insp => (
                  <label key={insp.id} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-[#27AE60] hover:bg-green-50/30 transition-all shadow-sm">
                    <input type="checkbox" checked={form.inspectionIds.includes(insp.id)} onChange={() => toggleInspection(insp.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-[#27AE60] focus:ring-[#27AE60]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-black text-[#27AE60]">#{insp.id.substring(0,6).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(insp.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-700 truncate">{insp.type || 'Apontamento'}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{insp.sectorName || 'Setor não informado'} {insp.locationName ? `— ${insp.locationName}` : ''}</p>
                      {insp.description && (
                        <p className="text-[11px] text-gray-400 mt-1 italic line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100">{insp.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Checklist */}
          {activeSection === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-[#27AE60] font-bold text-lg">Checklist de Conformidade NRs</h3>
                <button type="button" onClick={handleAIFill} disabled={aiLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-opacity disabled:opacity-60">
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiLoading ? 'Analisando...' : 'Preencher via IA'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>No. de Funcionarios:</span>
                <input type="number" min="0" className="w-24 p-1 border rounded text-sm"
                  value={form.numberOfEmployees} onChange={e => setForm({ ...form, numberOfEmployees: e.target.value })} placeholder="Ex: 50" />
              </div>
              <p className="text-xs text-gray-400 italic">Clique em "Preencher via IA" para marcar automaticamente com base nas inspecoes selecionadas, ou ajuste manualmente abaixo.</p>
              {TECHNICAL_CHECKLIST.map(cat => (
                <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 text-sm font-bold">{cat.id} {cat.title}</div>
                  <div className="divide-y divide-gray-100">
                    {cat.items.map(item => {
                      const ans = (form.checklistAnswers as any)[item.id] || 'C';
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                          <span className="text-xs text-gray-400 w-8 flex-shrink-0">{item.id}</span>
                          <span className="text-xs text-gray-700 flex-1">{item.text}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            {(['C', 'NC', 'NA'] as const).map(opt => (
                              <button key={opt} type="button" onClick={() => setAnswer(item.id, opt)}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all border ${
                                  ans === opt
                                    ? opt === 'C'  ? 'bg-green-500 text-white border-green-500'
                                    : opt === 'NC' ? 'bg-red-500 text-white border-red-500'
                                    :                'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                                }`}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 4: Final Notes */}
          {activeSection === 4 && (
            <div className="space-y-6">
              <h3 className="text-[#27AE60] font-bold text-lg">Anotacoes Finais e Assinaturas</h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Anotacoes de Nao Conformidade e/ou Recomendacoes</label>
                <textarea rows={6} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  placeholder="Descreva as nao conformidades, recomendacoes e prazos..."
                  value={form.finalNotes} onChange={e => setForm({ ...form, finalNotes: e.target.value })} />
              </div>
              
              <div className="mt-4 max-w-sm">
                <SignaturePad 
                  label="Assinatura do Inspetor (SESMT Central)"
                  initialSignature={form.technicianSignature}
                  onSignatureChange={(url) => setForm({ ...form, technicianSignature: url })}
                />
              </div>
              
              <p className="text-xs text-gray-400 italic">A assinatura desenhada acima será impressa no final do relatório em PDF centralizada (SESMT CENTRAL).</p>
            </div>
          )}

          {/* Navigation + Save */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {activeSection > 0 && (
                <button type="button" onClick={() => setActiveSection(s => s - 1)}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold">Anterior</button>
              )}
              {activeSection < sections.length - 1 && (
                <button type="button" onClick={() => setActiveSection(s => s + 1)}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold">Proximo</button>
              )}
            </div>
            <button type="submit" disabled={saving}
              className="bg-[#27AE60] hover:bg-[#219150] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Visita Técnica'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Visitas Técnicas (Relatório Fotográfico)</h1>
        <button onClick={openCreate} className="bg-[#27AE60] hover:bg-[#219150] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nova Visita
        </button>
      </div>
      {visits.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="text-lg font-bold mb-2">Nenhuma visita tecnica registrada</p>
          <p className="text-sm">Clique em "Nova Visita" para comecar.</p>
        </div>
      )}
      <div className="space-y-4">
        {visits.map(v => (
          <div key={v.id} className="group bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between shadow-sm hover:shadow-xl hover:border-[#27AE60]/20 transition-all duration-300">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex flex-col items-center justify-center text-[#27AE60] border border-green-100 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 mb-0.5" />
                <span className="text-[10px] font-black uppercase">{new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span>
              </div>
              <div className="space-y-1">
                <p className="font-black text-gray-800 text-lg group-hover:text-[#27AE60] transition-colors">{v.unitName}</p>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">{v.companyName}</span>
                  <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {v.inspectionIds?.length || 0} Apontamentos</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(v)} className="p-3 text-gray-400 hover:text-[#27AE60] hover:bg-green-50 rounded-2xl transition-all" title="Editar"><Edit2 className="w-6 h-6" /></button>
              <button onClick={() => downloadPDF(v.id)} className="p-3 text-white bg-[#27AE60] hover:bg-[#219150] rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95" title="Baixar PDF"><Download className="w-6 h-6" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
