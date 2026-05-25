import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import type { Notice, ReactionType } from '../../types';
import { 
  Megaphone, 
  Send, 
  Smile, 
  ShieldAlert,
  Loader2,
  Trash2,
  Image as ImageIcon,
  FileText,
  Download,
  X
} from 'lucide-react';

export const Notices: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes } = useUIStore();
  
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reactingIds, setReactingIds] = useState<string[]>([]);

  // New notice form state
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'TEACHERS' | 'CLASS'>('ALL');
  const [targetClassId, setTargetClassId] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const reactionsList: { type: ReactionType; emoji: string }[] = [
    { type: 'LIKE', emoji: '👍' },
    { type: 'LOVE', emoji: '❤️' },
    { type: 'THANKFUL', emoji: '🙏' },
    { type: 'CELEBRATE', emoji: '🎉' },
  ];

  useEffect(() => {
    fetchNotices();
    
    // Subscribe to real-time bulletins!
    const bulletinChannel = supabase
      .channel('public:notices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bulletinChannel);
    };
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      
      // Select notices joined with profiles & custom reactions.
      // RLS policies are applied automatically by Supabase, restricting what role gets which notice!
      const { data, error } = await supabase
        .from('notices')
        .select(`
          *,
          author:users!author_id(*),
          reactions:notice_reactions(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format notices with counts and active reactions
      const formatted: Notice[] = (data || []).map((notice: any) => {
        const reactions_count: Record<ReactionType, number> = {
          LIKE: 0,
          LOVE: 0,
          THANKFUL: 0,
          CELEBRATE: 0,
        };

        let user_reaction: ReactionType | undefined;

        notice.reactions?.forEach((r: any) => {
          reactions_count[r.reaction as ReactionType] = (reactions_count[r.reaction as ReactionType] || 0) + 1;
          if (r.user_id === user?.id) {
            user_reaction = r.reaction as ReactionType;
          }
        });

        return {
          ...notice,
          reactions_count,
          user_reaction,
        };
      });

      setNotices(formatted);
    } catch (err: any) {
      console.error('Error fetching notices:', err);
      showToast(err.message || 'Error fetching bulletins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user) return;
    if (!content.trim() && !photoFile && !pdfFile) {
      showToast('Please add text content, a photo, or a PDF attachment.', 'error');
      return;
    }

    try {
      setCreating(true);

      let finalPhotoUrl = null;
      let finalPdfUrl = null;

      // Handle Sandbox Mode (guest)
      if (user.id.startsWith('guest-') || user.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(r => setTimeout(r, 1200));
        
        if (photoFile) finalPhotoUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
        if (pdfFile) finalPdfUrl = '#';

        const mockNotice: any = {
          id: Math.random().toString(),
          title,
          content: content.trim() || null,
          photo_url: finalPhotoUrl,
          pdf_url: finalPdfUrl,
          author_id: user.id,
          target_type: targetType,
          target_class_id: targetType === 'CLASS' ? targetClassId : null,
          created_at: new Date().toISOString(),
          author: { full_name: user.full_name, role: user.role },
          reactions_count: { LIKE: 0, LOVE: 0, THANKFUL: 0, CELEBRATE: 0 },
          user_reaction: undefined
        };

        setNotices([mockNotice, ...notices]);
        showToast('Bulletin announcement posted successfully (Sandbox Mode)!', 'success');
        setTitle('');
        setContent('');
        setPhotoFile(null);
        setPdfFile(null);
        setTargetType('ALL');
        setTargetClassId('');
        setShowPostPopup(false);
        return;
      }

      // Upload Photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `notice_photo_${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, photoFile, { contentType: photoFile.type || 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      // Upload PDF if exists
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `notice_pdf_${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, pdfFile, { contentType: 'application/pdf' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        finalPdfUrl = publicUrl;
      }

      const noticePayload: any = {
        title,
        content: content.trim() || null,
        photo_url: finalPhotoUrl,
        pdf_url: finalPdfUrl,
        author_id: user.id,
        target_type: targetType,
        target_class_id: targetType === 'CLASS' ? targetClassId : null,
      };

      const { error } = await supabase
        .from('notices')
        .insert(noticePayload);

      if (error) throw error;

      showToast('Bulletin announcement posted successfully!', 'success');
      setTitle('');
      setContent('');
      setPhotoFile(null);
      setPdfFile(null);
      setTargetType('ALL');
      setTargetClassId('');
      setShowPostPopup(false);
      fetchNotices();
    } catch (err: any) {
      showToast(err.message || 'Failed to post notice', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleReaction = async (noticeId: string, reaction: ReactionType) => {
    if (!user) return;
    if (reactingIds.includes(noticeId)) return;

    const notice = notices.find((n) => n.id === noticeId);
    if (!notice) return;

    // Handle guest account local in-memory toggle instantly
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      setNotices(prevNotices => prevNotices.map(n => {
        if (n.id !== noticeId) return n;

        const newCounts = { ...n.reactions_count } as Record<ReactionType, number>;
        let newUserReaction: ReactionType | undefined = reaction;

        // Decrement previous reaction if it exists
        if (n.user_reaction) {
          newCounts[n.user_reaction] = Math.max(0, (newCounts[n.user_reaction] || 0) - 1);
        }

        // Toggle logic: if clicking active reaction, remove it. Otherwise, add new reaction.
        if (n.user_reaction === reaction) {
          newUserReaction = undefined;
        } else {
          newCounts[reaction] = (newCounts[reaction] || 0) + 1;
        }

        return {
          ...n,
          reactions_count: newCounts,
          user_reaction: newUserReaction
        } as Notice;
      }));
      return;
    }

    try {
      setReactingIds(prev => [...prev, noticeId]);

      if (notice.user_reaction === reaction) {
        // Remove reaction
        await supabase
          .from('notice_reactions')
          .delete()
          .eq('notice_id', noticeId)
          .eq('user_id', user.id);
      } else {
        // Upsert reaction
        await supabase
          .from('notice_reactions')
          .upsert({
            notice_id: noticeId,
            user_id: user.id,
            reaction,
          });
      }
      fetchNotices();
    } catch (err: any) {
      console.error('Failed to update reaction:', err);
    } finally {
      setReactingIds(prev => prev.filter(id => id !== noticeId));
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Bulletin removed', 'success');
      fetchNotices();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const canPost = user?.role === 'ADMIN';

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 px-4 py-5 animate-fade-in relative">
      {/* Notice Board Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h2 className="text-lg font-display font-extrabold text-white flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <span>Bulletin Notices</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Real-time school boards & direct circulars.</p>
        </div>
        {canPost && (
          <button
            onClick={() => setShowPostPopup(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-purple hover:brightness-110 text-white text-[10px] font-extrabold font-display uppercase tracking-widest shadow-glow-primary active:scale-98 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>Post Notice</span>
          </button>
        )}
      </div>

      {/* Notice Creation Popup Modal (Authorized Only) */}
      {canPost && showPostPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in select-none">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-neutral-border shadow-premium overflow-hidden animate-scale-in relative max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border/40 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest font-display">Create School Notice</span>
              </div>
              <button 
                onClick={() => setShowPostPopup(false)} 
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateNotice} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Sports Meet 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Announcement Content</label>
                  <textarea
                    placeholder="Announcement Content (optional if photo or PDF is attached)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full glass-input min-h-[110px] text-xs resize-none"
                  />
                </div>

                {/* File attachment upload cards */}
                <div className="grid grid-cols-1 gap-3 pt-1">
                  {/* Photo Attachment Picker */}
                  <div className="relative">
                    {photoFile ? (
                      <div className="glass-panel p-3 rounded-xl border border-primary/30 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-white truncate">{photoFile.name}</p>
                            <p className="text-[8px] text-gray-500 font-medium">{(photoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setPhotoFile(null)} 
                          className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center space-x-2 p-3.5 rounded-xl border border-dashed border-neutral-border/60 hover:border-primary/50 bg-surface/10 hover:bg-primary/5 transition-all cursor-pointer select-none">
                        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Add Photo Announcement</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setPhotoFile(file);
                          }} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {/* PDF Attachment Picker */}
                  <div className="relative">
                    {pdfFile ? (
                      <div className="glass-panel p-3 rounded-xl border border-accent-emerald/30 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-accent-emerald/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-accent-emerald" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-white truncate">{pdfFile.name}</p>
                            <p className="text-[8px] text-gray-500 font-medium">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setPdfFile(null)} 
                          className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center space-x-2 p-3.5 rounded-xl border border-dashed border-neutral-border/60 hover:border-accent-emerald/50 bg-surface/10 hover:bg-accent-emerald/5 transition-all cursor-pointer select-none">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Add PDF Circular</span>
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
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Target Audience</label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full glass-input text-xs"
                    >
                      <option value="ALL">All School</option>
                      <option value="TEACHERS">Teachers Only</option>
                      <option value="CLASS">Specific Class</option>
                    </select>
                  </div>

                  {targetType === 'CLASS' && (
                    <div>
                      <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Select Standard</label>
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full glass-input text-xs"
                        required
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>Class {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-primary to-accent-purple text-white text-xs font-bold font-display uppercase hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-glow-primary"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Announcement</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulletins List Feed */}
      <div className="flex-1 flex flex-col space-y-4">
        <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase border-b border-neutral-border pb-1 select-none">
          Active Publications ({notices.length})
        </h3>

        {loading && notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-gray-500">Loading notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border border-neutral-border">
            <ShieldAlert className="w-8 h-8 text-gray-600" />
            <p className="text-xs font-bold text-white">No active publications</p>
            <p className="text-[10px] text-gray-500 max-w-[200px]">Any notices targeting your role or classes will appear instantly here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className="glass-card p-5 rounded-2xl border border-neutral-border flex flex-col space-y-3 relative group animate-slide-up">
                
                {/* Notice meta headers */}
                <div className="flex justify-between items-start select-none">
                  <div>
                    <h4 className="text-sm font-extrabold text-white leading-snug">{notice.title}</h4>
                    <div className="flex items-center space-x-2 text-[9px] text-gray-400 mt-1">
                      <span>By: {notice.author?.full_name || 'System Board'}</span>
                      <span>•</span>
                      <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold border uppercase ${
                      notice.target_type === 'ALL' ? 'bg-primary/10 text-primary border-primary/20' :
                      notice.target_type === 'TEACHERS' ? 'bg-accent-rose/10 text-accent-rose border-accent-rose/20' :
                      'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20'
                    }`}>
                      {notice.target_type === 'CLASS' ? 'Class Targeted' : notice.target_type}
                    </span>

                    {user?.role === 'ADMIN' && (
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="text-gray-500 hover:text-accent-rose p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content body */}
                {notice.content && (
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{notice.content}</p>
                )}

                {/* Photo announcement rendering */}
                {notice.photo_url && (
                  <div className="w-full rounded-2xl overflow-hidden border border-neutral-border/40 max-h-[220px] bg-black/40 flex items-center justify-center mt-1 select-none">
                    <img 
                      src={notice.photo_url} 
                      alt={notice.title} 
                      className="w-full h-full object-contain max-h-[220px]"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* PDF circular rendering */}
                {notice.pdf_url && (
                  <div className="mt-1">
                    <a 
                      href={notice.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between p-3 rounded-xl bg-surface/40 hover:bg-surface/75 border border-neutral-border/50 hover:border-accent-emerald/40 transition-all cursor-pointer group/pdf select-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent-emerald/10 flex items-center justify-center text-accent-emerald flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">Circular Notice PDF</p>
                          <p className="text-[8px] text-gray-500 font-bold uppercase">Tap to view / download</p>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover/pdf:text-white transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                    </a>
                  </div>
                )}

                {/* Notice Social reactions panel (ADMIN view-only vs standard reactive view) */}
                <div className="flex items-center justify-between border-t border-neutral-border/30 pt-3 select-none">
                  <div className="flex items-center space-x-2">
                    {reactionsList.map((rx) => {
                      const count = notice.reactions_count?.[rx.type] || 0;
                      const isActive = notice.user_reaction === rx.type;
                      const isAdmin = user?.role === 'ADMIN';
                      
                      return (
                        <button
                          key={rx.type}
                          onClick={() => !isAdmin && handleReaction(notice.id, rx.type)}
                          disabled={isAdmin}
                          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 text-[10px] ${
                            isAdmin
                              ? 'bg-surface/10 border-neutral-border/10 text-neutral-muted cursor-default'
                              : isActive
                                ? 'bg-primary/20 border-primary text-white shadow-glow-primary cursor-pointer'
                                : 'bg-surface/30 border-neutral-border/50 text-gray-500 hover:text-white hover:border-neutral-border cursor-pointer'
                          }`}
                          title={isAdmin ? `Reactions: ${count}` : 'React to this notice'}
                        >
                          <span>{rx.emoji}</span>
                          <span className={isActive && !isAdmin ? 'font-black text-primary' : 'font-bold text-gray-300'}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center text-[9px] text-gray-500 select-none">
                    <Smile className="w-3.5 h-3.5 mr-1" />
                    <span>{user?.role === 'ADMIN' ? 'Viewing Reactions' : 'Click to react'}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
