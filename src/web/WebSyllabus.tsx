import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  X,
  Calendar,
  Filter,
  Users,
  AlertCircle
} from 'lucide-react';

interface SyllabusFile {
  id: string;
  title: string;
  file_url: string;
  class_id: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  class?: { name: string };
  uploader?: { full_name: string };
}

interface TeacherSchedule {
  id: string;
  teacher_id: string;
  title: string;
  file_url: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  teacher?: { full_name: string };
  uploader?: { full_name: string };
}

export const WebSyllabus: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes } = useUIStore();
  
  // Tab control: 'syllabus' | 'schedules'
  const [activeTab, setActiveTab] = useState<'syllabus' | 'schedules'>('syllabus');
  const [loading, setLoading] = useState(true);
  
  // States
  const [syllabuses, setSyllabuses] = useState<SyllabusFile[]>([]);
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Filter States
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('');
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [targetId, setTargetId] = useState(''); // class_id or teacher_id
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // PDF Preview State
  const [previewDoc, setPreviewDoc] = useState<{ title: string; file_url: string } | null>(null);

  useEffect(() => {
    fetchData();
    
    // Realtime listeners
    const syllChannel = supabase.channel('web-syllabus-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'syllabuses' }, () => {
        fetchSyllabuses();
      })
      .subscribe();

    const schedChannel = supabase.channel('web-schedule-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_schedules' }, () => {
        fetchSchedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(syllChannel);
      supabase.removeChannel(schedChannel);
    };
  }, [user, activeTab]);

  const fetchData = async () => {
    if (activeTab === 'syllabus') {
      await fetchSyllabuses();
    } else {
      await fetchSchedules();
    }
    if (user?.role === 'ADMIN') {
      await fetchTeachersList();
    }
  };

  const fetchTeachersList = async () => {
    const { data } = await supabase.from('users').select('id, full_name').eq('role', 'TEACHER');
    if (data) setTeachers(data);
  };

  const fetchSyllabuses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('syllabuses')
        .select(`
          *,
          uploader:users!uploaded_by(full_name),
          class:classes!class_id(name)
        `)
        .order('uploaded_at', { ascending: false });

      if (user?.role === 'STUDENT' && user.class_id) {
        query = query.eq('class_id', user.class_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSyllabuses(data as any || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('faculty_schedules')
        .select(`
          *,
          uploader:users!uploaded_by(full_name),
          teacher:users!teacher_id(full_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (user?.role === 'TEACHER') {
        query = query.eq('teacher_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSchedules(data as any || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !targetId || !pdfFile || !user) return;
    
    setUploading(true);
    try {
      const ext = pdfFile.name.split('.').pop();
      const storagePath = activeTab === 'syllabus' 
        ? `${targetId}/${Date.now()}.${ext}`
        : `schedules/${targetId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('syllabuses')
        .upload(storagePath, pdfFile, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('syllabuses')
        .getPublicUrl(storagePath);

      if (activeTab === 'syllabus') {
        const { error: dbError } = await supabase.from('syllabuses').insert({
          title: newTitle.trim(),
          class_id: targetId,
          file_url: publicUrl,
          size_bytes: pdfFile.size,
          uploaded_by: user.id
        });
        if (dbError) throw dbError;
        showToast('Syllabus uploaded successfully!', 'success');
        fetchSyllabuses();
      } else {
        const { error: dbError } = await supabase.from('faculty_schedules').insert({
          title: newTitle.trim(),
          teacher_id: targetId,
          file_url: publicUrl,
          size_bytes: pdfFile.size,
          uploaded_by: user.id
        });
        if (dbError) throw dbError;
        showToast('Faculty schedule published successfully!', 'success');
        fetchSchedules();
      }

      setNewTitle('');
      setTargetId('');
      setPdfFile(null);
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSyllabus = async (id: string) => {
    if (!window.confirm('Delete this syllabus?')) return;
    try {
      const { error } = await supabase.from('syllabuses').delete().eq('id', id);
      if (error) throw error;
      showToast('Syllabus deleted', 'success');
      fetchSyllabuses();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Delete this faculty schedule?')) return;
    try {
      const { error } = await supabase.from('faculty_schedules').delete().eq('id', id);
      if (error) throw error;
      showToast('Schedule deleted', 'success');
      fetchSchedules();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  // Filter computation
  const filteredSyllabuses = syllabuses.filter(s => 
    selectedClassFilter ? s.class_id === selectedClassFilter : true
  );

  const filteredSchedules = schedules.filter(s => 
    selectedTeacherFilter ? s.teacher_id === selectedTeacherFilter : true
  );

  return (
    <div className="animate-fade-in p-10 max-w-7xl mx-auto space-y-8 relative">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 mb-6 md:mb-0">
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-4 shadow-glow-primary">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-black text-primary uppercase tracking-widest">Academic Hub</span>
          </div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            Curriculum & Schedules
          </h2>
        </div>

        {/* Filters */}
        <div className="relative z-10 flex items-center space-x-4 w-full md:w-auto">
          {activeTab === 'syllabus' && user?.role !== 'STUDENT' && (
            <div className="relative w-full md:w-64">
              <Filter className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <select 
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full glass-input !pl-11 py-3 text-sm appearance-none bg-surface/50 text-white"
              >
                <option value="">Filter by Class (All)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>Class {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'schedules' && user?.role === 'ADMIN' && (
            <div className="relative w-full md:w-64">
              <Users className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <select 
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="w-full glass-input !pl-11 py-3 text-sm appearance-none bg-surface/50 text-white"
              >
                <option value="">Filter by Faculty (All)</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabs - only visible if role is ADMIN or TEACHER */}
      {user?.role !== 'STUDENT' && (
        <div className="flex bg-surface/30 p-1.5 rounded-2xl border border-white/5 max-w-md">
          <button 
            onClick={() => { setActiveTab('syllabus'); setPdfFile(null); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'syllabus' ? 'bg-primary text-background shadow-glow-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Class Syllabus</span>
          </button>
          <button 
            onClick={() => { setActiveTab('schedules'); setPdfFile(null); }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'schedules' ? 'bg-primary text-background shadow-glow-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Faculty Schedule</span>
          </button>
        </div>
      )}

      {/* Upload/Composition Panel (Admin only) */}
      {user?.role === 'ADMIN' && (
        <form onSubmit={handleFileUpload} className="glass-panel p-8 rounded-3xl border border-primary/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden space-y-6">
          <div className="flex items-center space-x-3">
            <UploadCloud className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-white">
              {activeTab === 'syllabus' ? 'Publish Academic Syllabus' : 'Publish Faculty Teaching Schedule'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Document Title</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full glass-input py-3 px-4 text-sm text-white"
                placeholder="e.g. Weekly Syllabus / Classroom Routine"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                {activeTab === 'syllabus' ? 'Target Standard' : 'Assign to Faculty'}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full glass-input py-3 px-4 text-sm bg-surface/80 text-white"
                required
              >
                <option value="">{activeTab === 'syllabus' ? '-- Select Class --' : '-- Choose Teacher --'}</option>
                {activeTab === 'syllabus' 
                  ? classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)
                  : teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)
                }
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Upload Document (PDF only)</label>
              {pdfFile ? (
                <div className="glass-panel p-2.5 rounded-xl border border-primary/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs text-white truncate font-bold">{pdfFile.name}</span>
                  </div>
                  <button type="button" onClick={() => setPdfFile(null)} className="text-gray-400 hover:text-white shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border border-dashed border-white/10 hover:border-primary/50 bg-surface/10 hover:bg-primary/5 transition-all cursor-pointer">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-300">Choose PDF...</span>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPdfFile(file);
                    }} 
                    className="hidden" 
                    required
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={uploading || !pdfFile}
              className="px-8 py-3 bg-primary text-background font-bold text-sm rounded-full flex items-center space-x-2 shadow-glow-primary hover:brightness-110 transition-all disabled:opacity-50"
            >
              {uploading ? <span>Uploading...</span> : <><span>Upload & Publish</span></>}
            </button>
          </div>
        </form>
      )}

      {/* Syllabuses Content Feed */}
      {activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center p-12 text-gray-500 font-medium">Fetching Academic Records...</div>
          ) : filteredSyllabuses.length === 0 ? (
            <div className="col-span-full glass-panel p-16 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">No Syllabus Documents</h3>
              <p className="text-gray-500 mt-2">No syllabus files exist for your target filter.</p>
            </div>
          ) : (
            filteredSyllabuses.map((file) => (
              <div key={file.id} className="bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <FileText className="w-24 h-24 text-primary rotate-12 -translate-y-4 translate-x-4" />
                </div>
                
                <div className="relative z-10 flex-1">
                  <div className="inline-block bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4">
                    Class {file.class?.name || 'All'}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug line-clamp-2">{file.title}</h3>
                  
                  <div className="flex items-center text-xs text-gray-500 font-semibold space-x-4">
                    <span>Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Size: {(file.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Uploader: {file.uploader?.full_name || 'Admin'}</p>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setPreviewDoc(file)}
                    className="flex flex-1 items-center justify-center space-x-2 text-sm font-bold text-primary hover:bg-primary/10 py-2 rounded-xl transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Curriculum</span>
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDeleteSyllabus(file.id)}
                      className="p-2 text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 rounded-xl transition-colors shrink-0 ml-2"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Teacher Schedules Content Feed */}
      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center p-12 text-gray-500 font-medium">Fetching Teaching Schedules...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="col-span-full glass-panel p-16 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">No Schedules Active</h3>
              <p className="text-gray-500 mt-2">No schedules or rotas have been assigned/published yet.</p>
            </div>
          ) : (
            filteredSchedules.map((sched) => (
              <div key={sched.id} className="bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 p-6 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <FileText className="w-24 h-24 text-primary rotate-12 -translate-y-4 translate-x-4" />
                </div>
                
                <div className="relative z-10 flex-1">
                  <div className="inline-block bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary mb-4">
                    Faculty Routine
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug line-clamp-2">{sched.title}</h3>
                  <p className="text-sm font-bold text-gray-300 mb-2">Teacher: {sched.teacher?.full_name || 'Assigned Staff'}</p>
                  
                  <div className="flex items-center text-xs text-gray-500 font-semibold space-x-4">
                    <span>Published: {new Date(sched.uploaded_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Size: {(sched.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setPreviewDoc(sched)}
                    className="flex flex-1 items-center justify-center space-x-2 text-sm font-bold text-primary hover:bg-primary/10 py-2 rounded-xl transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Routine</span>
                  </button>

                  {user?.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDeleteSchedule(sched.id)}
                      className="p-2 text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 rounded-xl transition-colors shrink-0 ml-2"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* High Fidelity Fullscreen 3D PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-2xl animate-fade-in">
          <div className="w-full h-full max-w-6xl bg-surface rounded-3xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-white font-bold text-sm">{previewDoc.title}</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Rendered securely in-app</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-neutral-900 relative">
              <iframe 
                src={`${previewDoc.file_url}#toolbar=0&navpanes=0`} 
                className="w-full h-full absolute inset-0 border-none"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
