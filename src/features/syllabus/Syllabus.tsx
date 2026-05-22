import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import {
  BookOpen, Search, AlertCircle, Loader2, FileText,
  Upload, Download, File, Calendar, Trash2, Users
} from 'lucide-react';

// ── Shared PDF card ──
const DocCard: React.FC<{
  doc: any; label: string; sublabel?: string;
  onDelete?: () => void; isAdmin?: boolean;
}> = ({ doc, label, sublabel, onDelete, isAdmin }) => (
  <div className="glass-card p-4 rounded-xl border border-neutral-border flex items-center justify-between animate-slide-up group hover:border-primary/30 transition-all">
    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
      <div className="w-10 h-10 rounded-lg bg-accent-rose/10 text-accent-rose border border-accent-rose/20 flex items-center justify-center flex-shrink-0">
        <File className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-neutral-text truncate">{doc.title}</h4>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-[9px] font-medium text-gray-400 bg-neutral-border/50 px-1.5 py-0.5 rounded uppercase">{label}</span>
          <span className="text-[9px] text-neutral-muted">• {(doc.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
        </div>
        {sublabel && <p className="text-[9px] text-neutral-muted mt-1.5 truncate">{sublabel}</p>}
      </div>
    </div>
    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
      {isAdmin && onDelete && (
        <button onClick={onDelete} className="w-8 h-8 rounded-full bg-neutral-border/30 flex items-center justify-center text-accent-rose hover:bg-accent-rose hover:text-white transition-colors cursor-pointer">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
        className="w-8 h-8 rounded-full bg-neutral-border/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer">
        <Download className="w-4 h-4" />
      </a>
    </div>
  </div>
);

// ── Upload form ──
const UploadForm: React.FC<{
  title: string; selectLabel: string; selectPlaceholder: string;
  options: { id: string; name: string }[];
  onSubmit: (targetId: string, title: string, file: File) => Promise<void>;
  isSubmitting: boolean;
}> = ({ title, selectLabel, selectPlaceholder, options, onSubmit, isSubmitting }) => {
  const [targetId, setTargetId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const { showToast } = useUIStore();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { showToast('Only PDF files allowed.', 'error'); return; }
    if (f.size > 10 * 1024 * 1024) { showToast('Max 10MB.', 'error'); return; }
    setFile(f);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !docTitle || !file) return;
    await onSubmit(targetId, docTitle, file);
    setTargetId(''); setDocTitle(''); setFile(null);
  };

  return (
    <form onSubmit={handle} className="glass-panel p-5 rounded-2xl border border-neutral-border shadow-premium space-y-4">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">📄 {title}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">{selectLabel}</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full glass-input text-xs" required>
            <option value="">{selectPlaceholder}</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Document Title</label>
          <input type="text" placeholder="e.g. Weekly Teaching Schedule" value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full glass-input text-xs" required />
        </div>
        <input type="file" accept=".pdf" ref={ref} onChange={handleFile} className="hidden" />
        <div onClick={() => ref.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-accent-green/50 bg-accent-green/10' : 'border-primary/30 bg-primary/5 hover:border-primary/60'}`}>
          <FileText className={`w-8 h-8 mb-2 ${file ? 'text-accent-green' : 'text-primary/50'}`} />
          <p className={`text-xs font-bold ${file ? 'text-accent-green' : 'text-primary'}`}>{file ? file.name : 'Tap to select PDF'}</p>
          <p className="text-[9px] text-neutral-muted mt-1">{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Max: 10MB'}</p>
        </div>
      </div>
      <button type="submit" disabled={isSubmitting || !file}
        className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold uppercase hover:brightness-110 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-glow-primary">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-3.5 h-3.5" /><span>Upload & Publish</span></>}
      </button>
    </form>
  );
};

// ═══════════════════════════════════════════════
// ██ MAIN COMPONENT
// ═══════════════════════════════════════════════
export const Syllabus: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes } = useUIStore();
  const role = user?.role || 'STUDENT';

  // Admin tab: 'syllabus' | 'schedule'
  const [adminTab, setAdminTab] = useState<'syllabus' | 'schedule'>('syllabus');
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // ── Fetch data ──
  const fetchSyllabuses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('syllabuses').select('*, users ( full_name )')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setSyllabuses(data || []);
    } catch { setSyllabuses([]); }
    finally { setLoading(false); }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('faculty_schedules').select('*, users:uploaded_by ( full_name ), teacher:teacher_id ( full_name )')
        .order('uploaded_at', { ascending: false });
      // Teachers only see their own
      if (role === 'TEACHER' && user) {
        query = query.eq('teacher_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setSchedules(data || []);
    } catch { setSchedules([]); }
    finally { setLoading(false); }
  };

  const fetchTeachers = async () => {
    const { data } = await supabase.from('users').select('id, full_name').eq('role', 'TEACHER');
    setTeachers(data || []);
  };

  useEffect(() => {
    if (role === 'TEACHER') {
      fetchSchedules();
    } else if (role === 'ADMIN') {
      fetchSyllabuses(); fetchSchedules(); fetchTeachers();
    } else {
      fetchSyllabuses();
    }

    // Real-time subscriptions
    const syllCh = supabase.channel('syll_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'syllabuses' }, () => fetchSyllabuses())
      .subscribe();
    const schedCh = supabase.channel('sched_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_schedules' }, () => fetchSchedules())
      .subscribe();
    return () => { supabase.removeChannel(syllCh); supabase.removeChannel(schedCh); };
  }, [role]);

  // ── Upload handlers ──
  const uploadSyllabus = async (classId: string, title: string, file: File) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${classId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('syllabuses').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('syllabuses').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('syllabuses').insert({
        title, class_id: classId, file_url: publicUrl, size_bytes: file.size, uploaded_by: user.id
      });
      if (dbErr) throw dbErr;
      showToast('Syllabus uploaded!', 'success');
      setShowUpload(false); fetchSyllabuses();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const uploadSchedule = async (teacherId: string, title: string, file: File) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `schedules/${teacherId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('syllabuses').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('syllabuses').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('faculty_schedules').insert({
        title, teacher_id: teacherId, file_url: publicUrl, size_bytes: file.size, uploaded_by: user.id
      });
      if (dbErr) throw dbErr;
      showToast('Faculty schedule published!', 'success');
      setShowUpload(false); fetchSchedules();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setIsSubmitting(false); }
  };

  const deleteSyllabus = async (id: string) => {
    await supabase.from('syllabuses').delete().eq('id', id);
    fetchSyllabuses();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('faculty_schedules').delete().eq('id', id);
    fetchSchedules();
  };

  // ── Filtered lists ──
  const filteredSyllabuses = syllabuses.filter(s => {
    if (role === 'STUDENT') return s.class_id === user?.class_id;
    return selectedClassId ? s.class_id === selectedClassId : true;
  });

  const filteredSchedules = schedules.filter(s => {
    if (role === 'TEACHER') return true; // already filtered server-side
    return selectedTeacherId ? s.teacher_id === selectedTeacherId : true;
  });

  // ═══════════════════════════════════════
  // ██ TEACHER VIEW — "My Teaching Schedule"
  // ═══════════════════════════════════════
  if (role === 'TEACHER') {
    return (
      <div className="w-full flex-1 flex flex-col space-y-6 px-4 py-5 animate-fade-in">
        <div>
          <h2 className="text-lg font-display font-extrabold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>My Teaching Schedule</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Your personalized routine pushed by administration</p>
        </div>

        <div className="flex-1 flex flex-col space-y-3">
          <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase pb-1 border-b border-neutral-border/30">
            Routine Documents ({filteredSchedules.length})
          </h3>
          {loading ? (
            <div className="flex flex-col items-center py-10 space-y-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-gray-500">Loading schedule...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="glass-card p-6 rounded-xl flex flex-col items-center text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-600 animate-bounce" />
              <p className="text-xs font-bold text-white">No schedule published yet</p>
              <p className="text-[10px] text-gray-500">Your teaching routine will appear here once published by the admin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchedules.map(s => (
                <DocCard key={s.id} doc={s}
                  label="Routine"
                  sublabel={`Published by ${(s as any).users?.full_name || 'Admin'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ██ STUDENT VIEW — "Class Syllabus"
  // ═══════════════════════════════════════
  if (role === 'STUDENT') {
    const studentClass = classes.find(c => c.id === user?.class_id);
    return (
      <div className="w-full flex-1 flex flex-col space-y-6 px-4 py-5 animate-fade-in">
        <div>
          <h2 className="text-lg font-display font-extrabold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>Academic Syllabus</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {studentClass ? `Official curriculum for Class ${studentClass.name}` : 'Official curriculum guidelines'}
          </p>
        </div>

        <div className="flex-1 flex flex-col space-y-3">
          <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase pb-1 border-b border-neutral-border/30">
            Available Documents ({filteredSyllabuses.length})
          </h3>
          {loading ? (
            <div className="flex flex-col items-center py-10 space-y-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-gray-500">Retrieving syllabus files...</p>
            </div>
          ) : filteredSyllabuses.length === 0 ? (
            <div className="glass-card p-6 rounded-xl flex flex-col items-center text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-600 animate-bounce" />
              <p className="text-xs font-bold text-white">No syllabus uploaded yet</p>
              <p className="text-[10px] text-gray-500">Course curriculum PDFs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSyllabuses.map(s => {
                const cls = classes.find(c => c.id === s.class_id);
                return <DocCard key={s.id} doc={s} label={`Class ${cls?.name || '?'}`} sublabel={`Uploaded by ${s.users?.full_name || 'Admin'}`} />;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ██ ADMIN VIEW — Tabbed: Syllabus + Faculty Schedule
  // ═══════════════════════════════════════
  const isScheduleTab = adminTab === 'schedule';

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 px-4 py-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-extrabold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>Academics Hub</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Manage syllabus & faculty teaching schedules</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-[10px] font-bold tracking-wide uppercase hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-glow-primary">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-surface/50 p-1 rounded-xl border border-neutral-border/30">
        <button onClick={() => { setAdminTab('syllabus'); setShowUpload(false); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            !isScheduleTab ? 'bg-primary text-white shadow-glow-primary' : 'text-gray-400 hover:text-white'}`}>
          <BookOpen className="w-3.5 h-3.5" /><span>Class Syllabus</span>
        </button>
        <button onClick={() => { setAdminTab('schedule'); setShowUpload(false); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            isScheduleTab ? 'bg-primary text-white shadow-glow-primary' : 'text-gray-400 hover:text-white'}`}>
          <Calendar className="w-3.5 h-3.5" /><span>Faculty Schedule</span>
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && !isScheduleTab && (
        <UploadForm title="Upload Class Syllabus (PDF)" selectLabel="Target Class" selectPlaceholder="-- Choose Class --"
          options={classes.map(c => ({ id: c.id, name: `Class ${c.name}` }))}
          onSubmit={uploadSyllabus} isSubmitting={isSubmitting} />
      )}
      {showUpload && isScheduleTab && (
        <UploadForm title="Push Faculty Teaching Schedule (PDF)" selectLabel="Select Teacher" selectPlaceholder="-- Choose Faculty --"
          options={teachers.map(t => ({ id: t.id, name: t.full_name }))}
          onSubmit={uploadSchedule} isSubmitting={isSubmitting} />
      )}

      {/* Filter */}
      {!isScheduleTab ? (
        <div className="glass-card p-3 rounded-xl flex items-center space-x-2 border border-neutral-border">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="flex-1 bg-transparent text-gray-300 text-xs outline-none cursor-pointer">
            <option value="" className="bg-background text-neutral-text">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id} className="bg-background text-neutral-text">Class {c.name}</option>)}
          </select>
        </div>
      ) : (
        <div className="glass-card p-3 rounded-xl flex items-center space-x-2 border border-neutral-border">
          <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="flex-1 bg-transparent text-gray-300 text-xs outline-none cursor-pointer">
            <option value="" className="bg-background text-neutral-text">All Faculty</option>
            {teachers.map(t => <option key={t.id} value={t.id} className="bg-background text-neutral-text">{t.full_name}</option>)}
          </select>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 flex flex-col space-y-3">
        <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase pb-1 border-b border-neutral-border/30">
          {isScheduleTab ? `Faculty Schedules (${filteredSchedules.length})` : `Syllabus Documents (${filteredSyllabuses.length})`}
        </h3>
        {loading ? (
          <div className="flex flex-col items-center py-10 space-y-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        ) : (isScheduleTab ? filteredSchedules : filteredSyllabuses).length === 0 ? (
          <div className="glass-card p-6 rounded-xl flex flex-col items-center text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-gray-600 animate-bounce" />
            <p className="text-xs font-bold text-white">{isScheduleTab ? 'No schedules published yet' : 'No syllabus uploaded yet'}</p>
            <p className="text-[10px] text-gray-500">{isScheduleTab ? 'Push teaching routines for faculty members.' : 'Upload class curriculum PDFs.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isScheduleTab ? filteredSchedules.map(s => (
              <DocCard key={s.id} doc={s} isAdmin label={(s as any).teacher?.full_name || 'Teacher'}
                sublabel={`Published ${new Date(s.uploaded_at).toLocaleDateString()}`}
                onDelete={() => deleteSchedule(s.id)} />
            )) : filteredSyllabuses.map(s => {
              const cls = classes.find(c => c.id === s.class_id);
              return <DocCard key={s.id} doc={s} isAdmin label={`Class ${cls?.name || '?'}`}
                sublabel={`Uploaded by ${s.users?.full_name || 'Admin'}`}
                onDelete={() => deleteSyllabus(s.id)} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
