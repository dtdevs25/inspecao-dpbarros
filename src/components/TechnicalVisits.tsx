import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Download, Mail, Sparkles, Loader2, ChevronDown, ChevronUp, Users, Calendar, ClipboardList, Search, X, Tag, ImagePlus } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from '../lib/dbBridge';
const db = {} as any;
import { useUser } from '../contexts/UserContext';
import { uploadFile } from '../lib/upload';
import { compressImage } from '../lib/utils';
import { TECHNICAL_CHECKLIST, ChecklistAnswers, DEFAULT_CHECKLIST_ANSWERS, ALL_CHECKLIST_ITEMS } from '../constants/technicalChecklist';
import { SignaturePad } from './SignaturePad';
import { cn } from '../lib/utils';

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
  const [engEmailInput, setEngEmailInput] = useState('');
  const [techInput, setTechInput] = useState('');
  const [techEmailInput, setTechEmailInput] = useState('');

  const emptyForm = () => ({
    companyId: '', unitId: '', date: new Date().toISOString().split('T')[0],
    ...DEFAULTS,
    numberOfEmployees: '',
    finalNotes: '',
    inspectionIds: [] as string[],
    checklistAnswers: { ...DEFAULT_CHECKLIST_ANSWERS } as ChecklistAnswers,
    engineerResponsible: [] as string[],
    engineerEmails: [] as string[],
    technicianResponsible: [] as string[],
    technicianEmails: [] as string[],
    technicianSignature: null as string | null,
    engineerSignature: null as string | null,
    photoUrl: null as string | null,
    customItems: [] as { id: string; text: string; categoryId: string }[]
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
  const setCategoryAnswers = (cat: any, val: 'C' | 'NC' | 'NA') => {
    const newAnswers = { ...form.checklistAnswers };
    cat.items.forEach((item: any) => { newAnswers[item.id] = val; });
    form.customItems.filter((ci: any) => ci.categoryId === cat.id).forEach((ci: any) => { newAnswers[ci.id] = val; });
    setForm(prev => ({ ...prev, checklistAnswers: newAnswers }));
  };

  const addCustomItem = (categoryId: string) => {
    const text = prompt('Descrição do novo item:');
    if (!text?.trim()) return;
    
    const cat = TECHNICAL_CHECKLIST.find(c => c.id === categoryId);
    if (!cat) return;

    const existingIds = [
      ...cat.items.map(i => i.id),
      ...form.customItems.filter(ci => ci.categoryId === categoryId).map(ci => ci.id)
    ];

    const baseId = categoryId.split('.')[0];
    const nextNum = existingIds.length + 1;
    const newId = `${baseId}.${nextNum}`;
    
    setForm(prev => ({
      ...prev,
      customItems: [...prev.customItems, { id: newId, text: text.trim(), categoryId }],
      checklistAnswers: { ...prev.checklistAnswers, [newId]: 'C' }
    }));
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
        engineerEmails: Array.isArray(form.engineerEmails) ? form.engineerEmails.join(', ') : form.engineerEmails,
        technicianResponsible: Array.isArray(form.technicianResponsible) ? form.technicianResponsible.join(', ') : form.technicianResponsible,
        technicianEmails: Array.isArray(form.technicianEmails) ? form.technicianEmails.join(', ') : form.technicianEmails,
      };
      if (selectedFile) data.photoUrl = await uploadFile(selectedFile, 'foto-visita-dpbarros');
      else if (imagePreview) data.photoUrl = form.photoUrl || imagePreview;
      else data.photoUrl = null;

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
    const getSecureUrl = (url: string | null, defaultBucket: string) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        const token = localStorage.getItem('token') || '';
        const apiUrl = (import.meta as any).env.VITE_API_URL || '';
        if (url.startsWith('/api/files/')) return `${apiUrl}${url}?token=${token}`;
        if (!url.startsWith('http')) return `${apiUrl}/api/files/${defaultBucket}/${url}?token=${token}`;
        return url;
    };

    setForm({ 
        ...emptyForm(), 
        ...v,
        engineerResponsible: v.engineerResponsible ? String(v.engineerResponsible).split(',').map(s => s.trim()).filter(Boolean) : [],
        engineerEmails: v.engineerEmails ? String(v.engineerEmails).split(',').map(s => s.trim()).filter(Boolean) : [],
        technicianResponsible: v.technicianResponsible ? String(v.technicianResponsible).split(',').map(s => s.trim()).filter(Boolean) : [],
        technicianEmails: v.technicianEmails ? String(v.technicianEmails).split(',').map(s => s.trim()).filter(Boolean) : [],
        technicianSignature: getSecureUrl(v.technicianSignature, 'assinatura-dpbarros'),
        engineerSignature: getSecureUrl(v.engineerSignature, 'assinatura-dpbarros'),
    }); 
    
    setImagePreview(getSecureUrl(v.photoUrl, 'foto-visita-dpbarros')); 
    
    setSelectedFile(null); 
    setActiveSection(0); 
    setViewMode('edit'); 
  };

  const downloadPDF = (id: string) => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || '';
    const token = localStorage.getItem('token') || '';
    const url = `${apiUrl}/api/reports/technical-visit/${id}/pdf?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const sendEmail = async (id: string) => {
    if (sendingEmail) return;
    setSendingEmail(id);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/reports/technical-visit/${id}/send-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmailModal({
          type: 'success',
          title: 'E-mail enviado!',
          message: `Relatório enviado com sucesso para ${data.sent} destinatário(s).`
        });
      } else {
        setEmailModal({
          type: 'error',
          title: 'Falha no envio',
          message: data.error || 'Não foi possível enviar o e-mail. Verifique os destinatários configurados.'
        });
      }
    } catch {
      setEmailModal({
        type: 'error',
        title: 'Erro de conexão',
        message: 'Falha na conexão ao tentar enviar o e-mail. Tente novamente.'
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const addTag = (field: 'engineerResponsible' | 'technicianResponsible', emailField: 'engineerEmails' | 'technicianEmails', nameValue: string, emailValue: string) => {
    if (!nameValue.trim() || !emailValue.trim()) {
        alert('Por favor, informe tanto o Nome quanto o E-mail.');
        return;
    }
    setForm(prev => ({ 
        ...prev, 
        [field]: [...(prev[field] as string[]), nameValue.trim()],
        [emailField]: [...((prev[emailField] as string[]) || []), emailValue.trim()]
    }));
    if (field === 'engineerResponsible') { setEngInput(''); setEngEmailInput(''); }
    else { setTechInput(''); setTechEmailInput(''); }
  };

  const removeTag = (field: 'engineerResponsible' | 'technicianResponsible', emailField: 'engineerEmails' | 'technicianEmails', index: number) => {
    setForm(prev => ({ 
        ...prev, 
        [field]: (prev[field] as string[]).filter((_, i) => i !== index),
        [emailField]: ((prev[emailField] as string[]) || []).filter((_, i) => i !== index)
    }));
  };

  const sections = ['Geral', 'Docs. SESMT', 'Inspeções', 'Check List', 'Anotações'];

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
        <div className="flex flex-wrap border-b border-gray-200 mt-6 px-2 gap-y-1">
          {sections.map((s, i) => (
            <button key={i} type="button" onClick={() => setActiveSection(i)}
              className={`px-4 py-3 text-[13px] sm:text-sm font-bold transition-all relative border-t border-x rounded-t-xl -mb-px
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
                        <Tag className="w-3 h-3" /> {eng} {form.engineerEmails?.[idx] ? `(${form.engineerEmails[idx]})` : ''}
                        <button type="button" onClick={() => removeTag('engineerResponsible', 'engineerEmails', idx)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm min-w-0"
                      placeholder="Nome do Engenheiro..." value={engInput} onChange={e => setEngInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('engineerResponsible', 'engineerEmails', engInput, engEmailInput); } }} />
                    <input type="email" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm min-w-0"
                      placeholder="E-mail *" value={engEmailInput} onChange={e => setEngEmailInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('engineerResponsible', 'engineerEmails', engInput, engEmailInput); } }} />
                    <button type="button" onClick={() => addTag('engineerResponsible', 'engineerEmails', engInput, engEmailInput)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 sm:py-0 rounded-xl font-bold text-gray-600 transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Técnico(s) de Segurança</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(form.technicianResponsible as string[]).map((tech, idx) => (
                      <span key={idx} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-purple-100">
                        <Tag className="w-3 h-3" /> {tech} {form.technicianEmails?.[idx] ? `(${form.technicianEmails[idx]})` : ''}
                        <button type="button" onClick={() => removeTag('technicianResponsible', 'technicianEmails', idx)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm min-w-0"
                      placeholder="Nome do Técnico..." value={techInput} onChange={e => setTechInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('technicianResponsible', 'technicianEmails', techInput, techEmailInput); } }} />
                    <input type="email" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#27AE60] outline-none text-sm min-w-0"
                      placeholder="E-mail *" value={techEmailInput} onChange={e => setTechEmailInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('technicianResponsible', 'technicianEmails', techInput, techEmailInput); } }} />
                    <button type="button" onClick={() => addTag('technicianResponsible', 'technicianEmails', techInput, techEmailInput)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 sm:py-0 rounded-xl font-bold text-gray-600 transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </button>
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
                      <button type="button" onClick={() => { setImagePreview(null); setSelectedFile(null); setForm({ ...form, photoUrl: null }); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 z-20"><X className="w-4 h-4" /></button>
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
              {TECHNICAL_CHECKLIST.map(cat => {
                const combinedItems = [
                  ...cat.items,
                  ...form.customItems.filter(ci => ci.categoryId === cat.id)
                ];

                return (
                  <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-800 text-white px-4 py-3 text-sm font-bold flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#27AE60] text-white px-2 py-0.5 rounded text-[10px] font-black">{cat.id}</span>
                        <span>{cat.title}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-white/10 p-1 rounded-lg">
                          {(['C', 'NC', 'NA'] as const).map(opt => (
                            <button key={opt} type="button" onClick={() => setCategoryAnswers(cat, opt)}
                              className="px-2 py-1 hover:bg-white/20 rounded text-[9px] font-black transition-colors uppercase">
                              Todos {opt}
                            </button>
                          ))}
                        </div>

                        <button type="button" onClick={() => handleAIFillCategory(cat)} disabled={aiLoading === cat.id}
                          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg text-[10px] transition-colors disabled:opacity-50">
                          {aiLoading === cat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {aiLoading === cat.id ? 'IA...' : 'Preencher IA'}
                        </button>
                        
                        <button type="button" onClick={() => addCustomItem(cat.id)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] transition-colors font-black uppercase">
                          <Plus className="w-3 h-3" /> Item
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {combinedItems.map(item => {
                        const ans = (form.checklistAnswers as any)[item.id] || 'C';
                        const isCustom = form.customItems.some(ci => ci.id === item.id);
                        return (
                          <div key={item.id} className={cn(
                            "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                            isCustom && "bg-emerald-50/30"
                          )}>
                            <span className="text-xs font-black text-[#27AE60] w-8 flex-shrink-0">{item.id}</span>
                            <span className="text-xs text-gray-700 flex-1 font-medium">
                              {item.text}
                              {isCustom && <span className="ml-2 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Personalizado</span>}
                            </span>
                            <div className="flex gap-1 flex-shrink-0">
                              {(['C', 'NC', 'NA'] as const).map(opt => (
                                <button key={opt} type="button" onClick={() => setAnswer(item.id, opt)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all border shadow-sm ${
                                    ans === opt
                                      ? opt === 'C'  ? 'bg-green-500 text-white border-green-500'
                                      : opt === 'NC' ? 'bg-red-500 text-white border-red-500'
                                      :                'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 hover:text-gray-600'
                                  }`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
    <>
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
                          <button
                            onClick={() => sendEmail(v.id)}
                            disabled={sendingEmail === v.id}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                            title="Enviar por E-mail"
                          >
                            {sendingEmail === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
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

      {/* Email Result Modal */}
      {emailModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-10 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-6 ${emailModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              {emailModal.type === 'success' ? (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <h3 className="text-2xl font-black text-gray-800 text-center mb-3 tracking-tight">{emailModal.title}</h3>
            <p className="text-gray-500 text-center text-base leading-relaxed mb-8 font-medium">{emailModal.message}</p>
            <button
              onClick={() => setEmailModal(null)}
              className={`w-full py-4 rounded-2xl font-black text-white text-base transition-all transform active:scale-95 shadow-lg ${emailModal.type === 'success' ? 'bg-[#27AE60] hover:bg-[#219150] shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
