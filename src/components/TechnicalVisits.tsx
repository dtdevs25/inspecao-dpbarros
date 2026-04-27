import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Download, Sparkles, Loader2, ChevronDown, ChevronUp, Users, Calendar, ClipboardList, Search, X, Tag, ImagePlus } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [engInput, setEngInput] = useState('');
  const [techInput, setTechInput] = useState('');

  const emptyForm = () => ({
    companyId: '', unitId: '', date: new Date().toISOString().split('T')[0],
    ...DEFAULTS,
    numberOfEmployees: '',
    finalNotes: '',
    inspectionIds: [] as string[],
    checklistAnswers: { ...DEFAULT_CHECKLIST_ANSWERS } as ChecklistAnswers,
    engineerResponsible: [] as string[],
    technicianResponsible: [] as string[],
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

  const handleAIFillCategory = async (cat: any) => {
    if (!form.inspectionIds.length) { alert('Selecione ao menos uma inspecao para usar a IA.'); return; }
    setAiLoading(cat.id);
    try {
      const selectedInspections = inspections.filter(i => form.inspectionIds.includes(i.id));
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/reports/technical-visit/auto-fill-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ inspections: selectedInspections, checklistItems: cat.items }),
      });
      if (!res.ok) throw new Error('Erro na IA');
      const { answers } = await res.json();
      setForm(prev => ({ ...prev, checklistAnswers: { ...prev.checklistAnswers, ...answers } }));
    } catch (e) { alert('Falha no preenchimento via IA. Tente novamente.'); }
    finally { setAiLoading(false); }
  };

  const handleSave = async (e?: React.FormEvent, stayInForm = false) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const unit = units.find(u => u.id === form.unitId);
      const companyId = unit?.companyId || form.companyId;
      const company = companies.find(c => c.id === companyId);
      const data: any = {
        ...form,
        companyId,
        companyName: company?.name || '',
        unitName: unit?.name || '',
        registeredBy: profile?.displayName || user?.email || '',
        registeredByUid: user?.uid || '',
        updatedAt: serverTimestamp(),
        engineerResponsible: Array.isArray(form.engineerResponsible) ? form.engineerResponsible.join(', ') : form.engineerResponsible,
        technicianResponsible: Array.isArray(form.technicianResponsible) ? form.technicianResponsible.join(', ') : form.technicianResponsible,
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
        const docRef = await addDoc(collection(db, 'technical_visits'), { ...data, createdAt: serverTimestamp() });
        if (stayInForm) {
            setSelectedItem({ id: docRef.id });
            setViewMode('edit');
        }
      }
      if (!stayInForm) setViewMode('list');
    } catch (err) { alert('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const openCreate = () => { setSelectedItem(null); setForm(emptyForm()); setImagePreview(null); setSelectedFile(null); setActiveSection(0); setViewMode('create'); };
  const openEdit = (v: any) => { 
    setSelectedItem(v); 
    setForm({ 
        ...emptyForm(), 
        ...v,
        engineerResponsible: v.engineerResponsible ? v.engineerResponsible.split(',').map((s:string) => s.trim()).filter(Boolean) : [],
        technicianResponsible: v.technicianResponsible ? v.technicianResponsible.split(',').map((s:string) => s.trim()).filter(Boolean) : [],
    }); 
    setImagePreview(v.photoUrl || null); 
    setSelectedFile(null); 
    setActiveSection(0); 
    setViewMode('edit'); 
  };

  const downloadPDF = async (id: string) => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || '';
    const res = await fetch(`${apiUrl}/api/reports/technical-visit/${id}/pdf`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) { alert('Falha ao gerar PDF'); return; }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `relatorio_${id.substring(0,6)}.pdf`; a.click();
  };

  const addTag = (field: 'engineerResponsible' | 'technicianResponsible', value: string) => {
    if (!value.trim()) return;
    setForm(prev => ({ ...prev, [field]: [...(prev[field] as string[]), value.trim()] }));
    if (field === 'engineerResponsible') setEngInput(''); else setTechInput('');
  };

  const removeTag = (field: 'engineerResponsible' | 'technicianResponsible', index: number) => {
    setForm(prev => ({ ...prev, [field]: (prev[field] as string[]).filter((_, i) => i !== index) }));
  };

  const sections = ['Dados Gerais', 'Documentacao SESMT', 'Inspecoes Vinculadas', 'Checklist NRs', 'Anotacoes Finais'];

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;

  if (viewMode === 'create' || viewMode === 'edit') {
    const filteredInspections = inspections.filter(i => (!form.companyId || i.companyId === form.companyId) && (!form.unitId || i.unitId === form.unitId));
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
          <h1 className="text-xl font-black text-[#1B4B66] tracking-tight">{viewMode === 'create' ? 'NOVA VISITA TÉCNICA' : 'EDITAR VISITA'}</h1>
          <button onClick={() => setViewMode('list')} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">Voltar</button>
        </div>

        {/* Section tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 mt-6 px-2">
          {sections.map((s, i) => (
            <button key={i} type="button" onClick={() => setActiveSection(i)}
              className={`px-6 py-3 text-sm font-bold transition-all relative border-t border-x rounded-t-xl -mb-px whitespace-nowrap
                ${activeSection === i 
                  ? 'bg-white border-gray-200 text-[#27AE60]' 
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {activeSection === i && <div className="absolute top-0 left-0 right-0 h-1 bg-[#27AE60] rounded-t-xl" />}
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => handleSave(e, false)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

          {/* Section 0: Dados Gerais */}
          {activeSection === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-[#27AE60] font-bold text-lg flex items-center gap-2">Dados Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Unidade *</label>
                  <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none"
                    value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })}>
                    <option value="">Selecione a Unidade...</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Data da Visita *</label>
                  <input type="date" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none"
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Engenheiro(s) Responsável(eis)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.engineerResponsible as string[]).map((eng, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-100">
                        <Tag className="w-3 h-3" /> {eng}
                        <button type="button" onClick={() => removeTag('engineerResponsible', idx)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm"
                      placeholder="Adicionar Engenheiro..." value={engInput} onChange={e => setEngInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('engineerResponsible', engInput); } }} />
                    <button type="button" onClick={() => addTag('engineerResponsible', engInput)} className="bg-gray-100 hover:bg-gray-200 px-4 rounded-xl font-bold text-sm text-gray-600 transition-colors">Add</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Técnico(s) de Segurança</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.technicianResponsible as string[]).map((tech, idx) => (
                      <span key={idx} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-purple-100">
                        <Tag className="w-3 h-3" /> {tech}
                        <button type="button" onClick={() => removeTag('technicianResponsible', idx)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm"
                      placeholder="Adicionar Técnico..." value={techInput} onChange={e => setTechInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('technicianResponsible', techInput); } }} />
                    <button type="button" onClick={() => addTag('technicianResponsible', techInput)} className="bg-gray-100 hover:bg-gray-200 px-4 rounded-xl font-bold text-sm text-gray-600 transition-colors">Add</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Entrada da Obra (Capa)</label>
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="flex-1 relative border-2 border-dashed border-gray-300 rounded-2xl hover:border-[#27AE60] bg-gray-50 hover:bg-green-50/30 transition-colors group cursor-pointer overflow-hidden min-h-[160px]">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#27AE60] p-4 text-center">
                      <ImagePlus className="w-10 h-10 mb-3" />
                      <p className="text-sm font-bold">Clique ou arraste a imagem aqui</p>
                      <p className="text-xs mt-1 opacity-70">PNG, JPG ou JPEG</p>
                    </div>
                  </div>
                  {imagePreview && (
                    <div className="w-full md:w-64 relative rounded-2xl border border-gray-200 bg-white p-2 shrink-0 flex items-center justify-center min-h-[160px]">
                      <img src={imagePreview} className="max-h-40 max-w-full object-contain rounded-xl" alt="Preview" />
                      <button type="button" onClick={() => { setImagePreview(null); setSelectedFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 z-20"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
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
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-[#27AE60] font-bold text-lg">Inspeções Vinculadas ({form.inspectionIds.length} selecionadas)</h3>
              <p className="text-sm text-gray-500">Selecione os apontamentos desta obra para incluir no relatório fotográfico.</p>
              {filteredInspections.length === 0 && <p className="text-gray-400 text-sm italic">Nenhuma inspecao encontrada para esta unidade.</p>}
              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-96">
                <table className="w-full text-left border-collapse relative">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-3 px-4 border-b border-gray-200 w-10"></th>
                      <th className="py-3 px-4 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">Nº</th>
                      <th className="py-3 px-4 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">Inspeção</th>
                      <th className="py-3 px-4 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                      <th className="py-3 px-4 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInspections.map((insp, idx) => (
                      <tr key={insp.id} className="hover:bg-green-50/50 cursor-pointer transition-colors bg-white" onClick={() => toggleInspection(insp.id)}>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={form.inspectionIds.includes(insp.id)} onChange={() => toggleInspection(insp.id)} className="h-4 w-4 rounded border-gray-300 text-[#27AE60] focus:ring-[#27AE60]" />
                        </td>
                        <td className="py-3 px-4 text-sm font-black text-[#27AE60]">#{String(filteredInspections.length - idx).padStart(5, '0')}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          <p className="line-clamp-2">{insp.description || 'Sem descrição'}</p>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-600">{insp.type || '-'}</td>
                        <td className="py-3 px-4 text-xs font-bold text-gray-400">{new Date(insp.date).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Checklist */}
          {activeSection === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-[#27AE60] font-bold text-lg">Checklist de Conformidade NRs</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>No. de Funcionarios:</span>
                <input type="number" min="0" className="w-24 p-1 border rounded text-sm bg-white"
                  value={form.numberOfEmployees} onChange={e => setForm({ ...form, numberOfEmployees: e.target.value })} placeholder="Ex: 50" />
              </div>
              <p className="text-xs text-gray-400 italic">Clique em "Preencher IA" na categoria desejada para analisar automaticamente com base nas inspeções selecionadas.</p>
              {TECHNICAL_CHECKLIST.map(cat => (
                <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-800 text-white px-4 py-3 text-sm font-bold flex items-center justify-between">
                    <span>{cat.id} {cat.title}</span>
                    <button type="button" onClick={() => handleAIFillCategory(cat)} disabled={aiLoading === cat.id}
                      className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50">
                      {aiLoading === cat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading === cat.id ? 'Analisando...' : 'Preencher IA'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {cat.items.map(item => {
                      const ans = (form.checklistAnswers as any)[item.id] || 'C';
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          <span className="text-xs font-bold text-gray-400 w-8 flex-shrink-0">{item.id}</span>
                          <span className="text-xs text-gray-700 flex-1">{item.text}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            {(['C', 'NC', 'NA'] as const).map(opt => (
                              <button key={opt} type="button" onClick={() => setAnswer(item.id, opt)}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all border ${
                                  ans === opt
                                    ? opt === 'C'  ? 'bg-green-500 text-white border-green-500 shadow-inner'
                                    : opt === 'NC' ? 'bg-red-500 text-white border-red-500 shadow-inner'
                                    :                'bg-blue-600 text-white border-blue-600 shadow-inner'
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
          <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
            <div className="flex gap-2">
              {activeSection > 0 && (
                <button type="button" onClick={() => setActiveSection(s => s - 1)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">Anterior</button>
              )}
              {activeSection < sections.length - 1 && (
                <button type="button" onClick={(e) => {
                  handleSave(e, true);
                  setActiveSection(s => s + 1);
                }}
                  className="px-5 py-2.5 bg-[#27AE60] hover:bg-[#219150] text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2">
                  Próximo {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                </button>
              )}
            </div>
            {activeSection === sections.length - 1 && (
              <button type="submit" disabled={saving}
                className="bg-[#27AE60] hover:bg-[#219150] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar Visita Técnica'}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  const filteredVisits = visits.filter(v => {
    const term = searchTerm.toLowerCase();
    return (v.companyName || '').toLowerCase().includes(term) ||
           (v.unitName || '').toLowerCase().includes(term) ||
           (v.registeredBy || '').toLowerCase().includes(term) ||
           new Date(v.date).toLocaleDateString('pt-BR').includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
        <h1 className="text-xl font-black text-[#1B4B66] tracking-tight uppercase">VISITAS TÉCNICAS</h1>
        <button onClick={openCreate} className="bg-[#27AE60] hover:bg-[#219150] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm">
          <Plus className="h-4 w-4" /> Nova Visita Técnica
        </button>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Pesquisar por Unidade, Data, Registrado Por..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] text-sm"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-[#27AE60] p-4 text-white font-bold flex items-center justify-center gap-2">
          <span>Visitas Técnicas (Total: {filteredVisits.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white border-b-2 border-green-500">
                <th className="py-3 px-3 text-left text-xs font-bold text-[#27AE60] uppercase tracking-wider border-r border-gray-100">Nº</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-[#27AE60] uppercase tracking-wider border-r border-gray-100">Unidade</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-[#27AE60] uppercase tracking-wider border-r border-gray-100">Data</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-[#27AE60] uppercase tracking-wider border-r border-gray-100">Apontamentos</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-[#27AE60] uppercase tracking-wider border-r border-gray-100">Registrado Por</th>
                <th className="py-3 px-3 text-center text-xs font-bold text-[#27AE60] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    Nenhuma visita técnica registrada ou encontrada na pesquisa.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="py-3 px-3 text-sm font-black text-gray-700">{filteredVisits.length - idx}</td>
                    <td className="py-3 px-4 text-sm font-bold text-[#27AE60]">{v.unitName || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium">
                      {new Date(v.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-xs">
                        {v.inspectionIds?.length || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">{v.registeredBy || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => downloadPDF(v.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Baixar PDF">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
