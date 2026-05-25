import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabaseClient';
import { 
  Send, 
  Search, 
  Users, 
  MessageSquare, 
  Clock, 
  User as UserIcon,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  Check,
  CheckCheck
} from 'lucide-react';

interface ChatChannel {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
  teacher?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
  messages?: { id: string; sender_id: string }[];
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  attachments?: {
    id: string;
    message_id: string;
    file_name: string;
    file_url: string;
    file_type: 'image' | 'pdf' | 'document' | 'zip' | 'spreadsheet' | 'presentation';
    file_size: number;
  }[];
}

export const WebChat: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { chatUnreadCounts, markChatAsRead, setActiveChatId } = useChatStore();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputText, setInputText] = useState('');
  
  // File uploads
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; category: 'image' | 'pdf' | 'document' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Sync / Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    fetchChannels();

    const chatsSub = supabase
      .channel('web-chats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChannels();
      })
      .subscribe();

    const messagesSub = supabase
      .channel('web-messages-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchChannels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsSub);
      supabase.removeChannel(messagesSub);
      setActiveChatId(null);
    };
  }, [user]);

  // Handle selected channel loading
  useEffect(() => {
    if (selectedChannel && user) {
      fetchMessages(selectedChannel.id);
      setActiveChatId(selectedChannel.id);
      markChatAsRead(selectedChannel.id, user.id);

      // Subscribe to this active channel
      const messagesChannel = supabase
        .channel(`web_chat_messages:${selectedChannel.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChannel.id}` },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const msgId = payload.new.id;

              // Read mark
              if (payload.new.sender_id !== user.id) {
                supabase
                  .from('messages')
                  .update({ is_read: true })
                  .eq('id', msgId)
                  .then();
              }

              // Build sender dynamically
              let msgSender = null;
              if (payload.new.sender_id === user.id) {
                msgSender = { id: user.id, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url };
              } else {
                const part = selectedChannel.student || selectedChannel.teacher;
                if (part && part.id === payload.new.sender_id) {
                  msgSender = part;
                } else {
                  // Fallback: system or admin profile
                  msgSender = { id: payload.new.sender_id, full_name: 'Administration', role: 'ADMIN', avatar_url: null };
                }
              }

              const newMsg: ChatMessage = {
                id: msgId,
                chat_id: payload.new.chat_id,
                sender_id: payload.new.sender_id,
                content: payload.new.content,
                is_read: payload.new.is_read || (payload.new.sender_id !== user.id),
                created_at: payload.new.created_at,
                sender: msgSender as any,
                attachments: []
              };

              setMessages(prev => {
                if (prev.some(m => m.id === msgId)) return prev;
                return [...prev, newMsg];
              });

              // Pull attachments
              const { data: attachments } = await supabase
                .from('message_attachments')
                .select('*')
                .eq('message_id', msgId);

              if (attachments && attachments.length > 0) {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, attachments } : m));
              }
              scrollToBottom();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedChannel]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchChannels = async () => {
    if (!user) return;
    try {
      setLoadingChannels(true);
      let query = supabase
        .from('chats')
        .select(`
          *,
          student:users!student_id(*),
          teacher:users!teacher_id(*),
          messages(id, sender_id)
        `);

      if (user.role === 'STUDENT') {
        query = query.eq('student_id', user.id);
      } else if (user.role === 'TEACHER') {
        query = query.eq('teacher_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const formatted = (data || []) as ChatChannel[];
      setChannels(formatted);

      if (user.role !== 'ADMIN') {
        if (formatted.length === 0) {
          await handleAutoCreateChannel();
        } else {
          setSelectedChannel(prev => prev ? prev : formatted[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleAutoCreateChannel = async () => {
    if (!user) return;
    try {
      const payload: any = {};
      if (user.role === 'STUDENT') {
        payload.student_id = user.id;
      } else if (user.role === 'TEACHER') {
        payload.teacher_id = user.id;
      }

      const { data, error } = await supabase
        .from('chats')
        .insert(payload)
        .select(`
          *,
          student:users!student_id(*),
          teacher:users!teacher_id(*)
        `)
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          const { data: existingData } = await supabase
            .from('chats')
            .select(`
              *,
              student:users!student_id(*),
              teacher:users!teacher_id(*)
            `)
            .match(payload)
            .single();
            
          if (existingData) {
            setChannels([existingData as ChatChannel]);
            setSelectedChannel(existingData as ChatChannel);
          }
        } else {
          throw error;
        }
      } else if (data) {
        setChannels([data as ChatChannel]);
        setSelectedChannel(data as ChatChannel);
      }
    } catch (err) {
      console.error('Failed auto-creating channel:', err);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(*),
          attachments:message_attachments(*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as ChatMessage[]) || []);
      scrollToBottom();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB', 'error');
      return;
    }

    let category: 'image' | 'pdf' | 'document' = 'document';
    if (file.type.startsWith('image/')) {
      category = 'image';
    } else if (file.type === 'application/pdf') {
      category = 'pdf';
    }

    setAttachedFile({ file, category });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getAttachmentPublicUrl = (filePath: string) => {
    if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      return filePath;
    }
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if ((!text && !attachedFile) || !selectedChannel || !user) return;

    const fileToUpload = attachedFile;
    setInputText('');
    setAttachedFile(null);

    // Optimistic item
    const tempId = `temp-${Date.now()}`;
    const optMsg: ChatMessage = {
      id: tempId,
      chat_id: selectedChannel.id,
      sender_id: user.id,
      content: text || null,
      created_at: new Date().toISOString(),
      is_read: false,
      sender: { id: user.id, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url || null },
      attachments: fileToUpload ? [{
        id: `temp-att-${Date.now()}`,
        message_id: tempId,
        file_name: fileToUpload.file.name,
        file_url: URL.createObjectURL(fileToUpload.file),
        file_type: fileToUpload.category,
        file_size: fileToUpload.file.size
      }] : []
    };

    setMessages(prev => [...prev, optMsg]);
    scrollToBottom();

    try {
      if (fileToUpload) setUploadingFile(true);

      const { data: dbMsg, error: dbErr } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChannel.id,
          sender_id: user.id,
          content: text || null
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: dbMsg.id, created_at: dbMsg.created_at } : m));

      if (fileToUpload) {
        const ext = fileToUpload.file.name.split('.').pop();
        const path = `chats/${selectedChannel.id}/${user.id}/${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('attachments')
          .upload(path, fileToUpload.file, { contentType: fileToUpload.file.type });

        if (upErr) throw upErr;

        const { data: attachDb, error: attachErr } = await supabase
          .from('message_attachments')
          .insert({
            message_id: dbMsg.id,
            file_name: fileToUpload.file.name,
            file_url: path,
            file_type: fileToUpload.category,
            file_size: fileToUpload.file.size
          })
          .select()
          .single();

        if (attachErr) throw attachErr;

        setMessages(prev => prev.map(m => m.id === dbMsg.id ? { ...m, attachments: [attachDb] } : m));
      }
    } catch (err: any) {
      showToast(err.message || 'Send failed', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setUploadingFile(false);
    }
  };

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const p = c.student || c.teacher;
      if (!p) return false;
      return p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [channels, searchTerm]);

  return (
    <div className="flex h-full w-full animate-fade-in relative z-10 p-6 space-x-6">
      
      {/* Sidebar - channel list (Only for admins/teachers) */}
      {user?.role === 'ADMIN' && (
        <div className="w-80 glass-panel rounded-3xl border border-white/5 flex flex-col shadow-2xl relative overflow-hidden shrink-0">
          <div className="p-6 border-b border-white/5 bg-black/20">
            <h2 className="text-xl font-display font-black text-white flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-accent-rose" />
              <span>Messenger</span>
            </h2>
            
            <div className="mt-4 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search channels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input !pl-10 py-2.5 text-xs bg-surface/50 text-white"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingChannels ? (
              <div className="text-center p-6 text-gray-500 font-medium">Syncing channels...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="text-center p-6 text-gray-600 font-bold">No channels available</div>
            ) : (
              filteredChannels.map(c => {
                const partner = c.student || c.teacher;
                const isSelected = selectedChannel?.id === c.id;
                const unread = chatUnreadCounts[c.id] || 0;
                
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChannel(c)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all border ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/20 shadow-glow-primary'
                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-gray-400'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-surface/80 flex items-center justify-center relative shrink-0 border border-white/5">
                      {partner?.avatar_url ? (
                        <img src={partner.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{partner?.full_name?.charAt(0)}</span>
                      )}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-rose text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left truncate">
                      <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : ''}`}>{partner?.full_name}</p>
                      <p className="text-[9px] font-black tracking-widest opacity-50 uppercase">{partner?.role}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main chat interface */}
      <div className="flex-1 glass-panel rounded-3xl border border-white/5 flex flex-col shadow-2xl relative overflow-hidden">
        {selectedChannel ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  {user?.role === 'ADMIN' ? (
                    <UserIcon className="w-6 h-6 text-primary" />
                  ) : (
                    <Users className="w-6 h-6 text-accent-rose" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {user?.role === 'ADMIN' 
                      ? (selectedChannel.student || selectedChannel.teacher)?.full_name 
                      : 'School Administration Support'
                    }
                  </h3>
                  <p className="text-xs text-gray-400 flex items-center mt-1">
                    <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse mr-2" />
                    Bidirectional Sync Active
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-xs text-gray-500 mt-2">Loading secure transcripts...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-300 font-bold">No messages here yet.</p>
                  <p className="text-gray-500 text-sm mt-2">Introduce yourself to establish the link.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
                      <div className={`max-w-[65%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && (
                          <span className="text-[10px] font-bold text-gray-500 mb-1 ml-1">
                            {msg.sender?.full_name || 'Staff Member'}
                          </span>
                        )}

                        <div className={`px-5 py-3.5 rounded-2xl backdrop-blur-md border ${
                          isMine 
                            ? 'bg-primary/20 border-primary/30 text-white rounded-tr-none shadow-[0_4px_20px_rgba(16,185,129,0.15)]' 
                            : 'bg-surface/60 border-white/10 text-gray-200 rounded-tl-none shadow-lg'
                        }`}>
                          {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                          {/* Render Attachments */}
                          {msg.attachments && msg.attachments.map((att) => (
                            <div key={att.id} className="mt-3">
                              {att.file_type === 'image' ? (
                                <div className="rounded-xl overflow-hidden max-h-48 border border-white/10 bg-black/40">
                                  <img 
                                    src={getAttachmentPublicUrl(att.file_url)} 
                                    alt={att.file_name} 
                                    className="max-h-48 object-cover cursor-pointer"
                                    onClick={() => window.open(getAttachmentPublicUrl(att.file_url), '_blank')}
                                  />
                                </div>
                              ) : (
                                <a 
                                  href={getAttachmentPublicUrl(att.file_url)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-3 p-3 rounded-xl bg-black/30 border border-white/5 hover:border-primary/30 transition-all"
                                >
                                  <FileText className="w-6 h-6 text-primary shrink-0" />
                                  <div className="truncate text-left">
                                    <p className="text-xs font-bold text-white truncate">{att.file_name}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase">{(att.file_size / (1024 * 1024)).toFixed(2)} MB • PDF/DOC</p>
                                  </div>
                                  <Download className="w-4 h-4 text-gray-400 ml-auto hover:text-white" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>

                        <span className="text-[9px] font-bold text-gray-600 mt-1.5 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && (
                            <span className="ml-2">
                              {msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> : <Check className="w-3.5 h-3.5 text-gray-500" />}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-6 border-t border-white/5 bg-black/40 relative z-10 flex flex-col space-y-3">
              {attachedFile && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in max-w-sm">
                  <div className="flex items-center space-x-2 truncate">
                    {attachedFile.category === 'image' ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                    <span className="text-xs text-white font-bold truncate">{attachedFile.file.name}</span>
                  </div>
                  <button type="button" onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="relative flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full border border-white/10 hover:border-primary/40 bg-surface/50 hover:bg-surface/80 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileAttach} 
                  className="hidden" 
                />

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your secure message..."
                    className="w-full bg-surface/50 border border-white/10 rounded-full py-3.5 pl-6 pr-14 text-white text-sm focus:outline-none focus:border-primary/50 focus:bg-surface/80 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || uploadingFile}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-background rounded-full flex items-center justify-center shadow-glow-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-300">Choose a Communication Link</h3>
            <p className="text-gray-500 text-sm mt-2">Select a channel in the sidebar to review transcripts.</p>
          </div>
        )}
      </div>

    </div>
  );
};
