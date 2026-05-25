import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Megaphone, Plus, Trash2, Calendar, User, Search, FileText, Download, X } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  target_type: 'ALL' | 'TEACHERS' | 'CLASS';
  target_class_id: string | null;
  photo_url: string | null;
  pdf_url: string | null;
  author_id: string;
  author: { full_name: string; role: string };
}

export const WebNotices: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes } = useUIStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Admin New Notice State
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTargetType, setNewTargetType] = useState<'ALL' | 'TEACHERS' | 'CLASS'>('ALL');
  const [newTargetClassId, setNewTargetClassId] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotices();

    // Subscribe to real-time changes for notices
    const channel = supabase.channel('web-notices-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notices')
        .select(`
          *,
          author:users!author_id(full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (user?.role === 'STUDENT') {
        const { data: userClass } = await supabase
          .from('users')
          .select('class_id')
          .eq('id', user.id)
          .single();

        query = query.or(`target_type.eq.ALL,and(target_type.eq.CLASS,target_class_id.eq.${userClass?.class_id})`);
      } else if (user?.role === 'TEACHER') {
        query = query.in('target_type', ['ALL', 'TEACHERS']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotices((data as any) || []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
      showToast('Notice deleted', 'success');
      fetchNotices();
    } catch (err) {
      showToast('Failed to delete notice', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      let finalPdfUrl = null;

      // PDF File upload logic
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `notice_pdf_${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, pdfFile, { contentType: 'application/pdf' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        finalPdfUrl = publicUrl;
      }

      const { error } = await supabase.from('notices').insert({
        title: newTitle.trim(),
        content: newContent.trim() || null,
        author_id: user?.id,
        target_type: newTargetType,
        target_class_id: newTargetType === 'CLASS' ? newTargetClassId : null,
        pdf_url: finalPdfUrl
      });
      
      if (error) throw error;
      
      showToast('Notice published successfully', 'success');
      setShowNewForm(false);
      setNewTitle('');
      setNewContent('');
      setNewTargetType('ALL');
      setNewTargetClassId('');
      setPdfFile(null);
      fetchNotices();
    } catch (err) {
      console.error(err);
      showToast('Failed to publish', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-sapphire/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 mb-6 md:mb-0">
          <div className="inline-flex items-center space-x-2 bg-accent-sapphire/10 border border-accent-sapphire/20 px-4 py-1.5 rounded-full mb-4 shadow-glow-primary">
            <Megaphone className="w-4 h-4 text-accent-sapphire" />
            <span className="text-[11px] font-black text-accent-sapphire uppercase tracking-widest">Global Bulletins</span>
          </div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            School Notices
          </h2>
        </div>

        <div className="relative z-10 flex items-center space-x-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search bulletins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input !pl-11 py-3 text-sm"
            />
          </div>
          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-6 py-3 bg-primary text-background font-bold text-sm rounded-full flex items-center space-x-2 shadow-glow-primary hover:brightness-110 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Post Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Compose Form */}
      {showNewForm && user?.role === 'ADMIN' && (
        <form onSubmit={handleCreate} className="glass-panel p-8 rounded-3xl border border-primary/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden animate-slide-up">
          <h3 className="text-xl font-bold text-white mb-6">Compose New Bulletin</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Subject Title</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full glass-input py-3 px-4 text-white"
                placeholder="Enter notice title"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Target Audience</label>
                <select 
                  value={newTargetType} 
                  onChange={(e) => setNewTargetType(e.target.value as any)}
                  className="w-full glass-input py-3 px-4 text-white bg-surface"
                >
                  <option value="ALL">All School (Public)</option>
                  <option value="CLASS">Specific Class</option>
                  <option value="TEACHERS">Teachers Only</option>
                </select>
              </div>
              
              {newTargetType === 'CLASS' && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Target Standard</label>
                  <select 
                    value={newTargetClassId} 
                    onChange={(e) => setNewTargetClassId(e.target.value)}
                    className="w-full glass-input py-3 px-4 text-white bg-surface"
                    required
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">PDF Attachment (Optional)</label>
              {pdfFile ? (
                <div className="glass-panel p-4 rounded-xl border border-primary/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-white">{pdfFile.name}</p>
                      <p className="text-xs text-gray-500">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPdfFile(null)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 p-6 rounded-2xl border border-dashed border-white/10 hover:border-primary/50 bg-surface/10 hover:bg-primary/5 transition-all cursor-pointer">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-300">Choose PDF Document...</span>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPdfFile(file);
                    }} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bulletin Content</label>
              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full glass-input py-3 px-4 text-white min-h-[120px] resize-y"
                placeholder="Type the detailed announcement here..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button 
                type="button" 
                onClick={() => { setShowNewForm(false); setPdfFile(null); }}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2.5 bg-primary text-background font-bold text-sm rounded-full flex items-center space-x-2 shadow-glow-primary hover:brightness-110 transition-all disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notices Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-12 text-gray-500 font-medium">Synchronizing Bulletins...</div>
        ) : filteredNotices.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
            <Megaphone className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-300">No Active Bulletins</h3>
            <p className="text-gray-500 mt-2">There are currently no announcements matching your criteria.</p>
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div key={notice.id} className="bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 p-6 hover:border-accent-sapphire/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent-sapphire/50 group-hover:bg-accent-sapphire transition-colors" />
              
              <div className="flex justify-between items-start pl-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full tracking-widest uppercase border ${
                      notice.target_type === 'ALL' ? 'bg-primary/10 text-primary border-primary/20' :
                      notice.target_type === 'TEACHERS' ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20' :
                      'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                    }`}>
                      {notice.target_type === 'ALL' ? 'General Broadcast' : notice.target_type === 'TEACHERS' ? 'Faculty Only' : 'Class Targeted'}
                    </span>
                    <span className="flex items-center text-[11px] font-semibold text-gray-500">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center text-[11px] font-semibold text-gray-500">
                      <User className="w-3.5 h-3.5 mr-1.5" />
                      {notice.author?.full_name || 'System Board'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{notice.title}</h3>
                  {notice.content && <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">{notice.content}</p>}
                  
                  {notice.photo_url && (
                    <div className="w-full rounded-2xl overflow-hidden border border-white/5 max-h-[300px] bg-black/40 flex items-center justify-center mt-2 mb-4">
                      <img src={notice.photo_url} alt={notice.title} className="max-h-[300px] object-contain" />
                    </div>
                  )}

                  {notice.pdf_url && (
                    <a 
                      href={notice.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between p-4 rounded-2xl bg-surface/50 border border-white/5 hover:border-primary/40 hover:bg-surface/80 transition-all group/pdf max-w-md"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Attachment Circular PDF</p>
                          <p className="text-xs text-gray-500 font-bold uppercase">Click to open / download</p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-gray-400 group-hover/pdf:text-white transition-colors" />
                    </a>
                  )}
                </div>
                
                {user?.role === 'ADMIN' && (
                  <button 
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10 rounded-xl transition-colors shrink-0 ml-4"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
