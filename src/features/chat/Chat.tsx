import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useChatStore } from '../../store/useChatStore';
import { supabase } from '../../lib/supabaseClient';
import type { ChatChannel, ChatMessage } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Download,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

export const Chat: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes, phonePreviewMode } = useUIStore();
  const { chatUnreadCounts, markChatAsRead, setActiveChatId } = useChatStore();

  const [chatActiveTab, setChatActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  
  const [adminProfile, setAdminProfile] = useState<{
    avatar_url: string;
    phone: string;
    email: string;
    full_name: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string; name: string } | null>(null);
  
  // Real-time window size tracker
  const [isWindowMobile, setIsWindowMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsWindowMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = isWindowMobile || phonePreviewMode;

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ file: File; category: 'image' | 'pdf' | 'document' }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChannels();
    
    const fetchAdminDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url, phone, email, full_name')
          .eq('email', 'gejikhors@gmail.com')
          .maybeSingle();

        if (!error && data) {
          setAdminProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch admin profile for chat:', err);
      }
    };
    fetchAdminDetails();
    
    // Subscribe to changes in public:chats
    const chatsSubscription = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChannels();
      })
      .subscribe();

    // Subscribe to changes in public:users (real-time profile updates)
    const usersSubscription = supabase
      .channel('public:chat_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAdminDetails();
        fetchChannels();
      })
      .subscribe();

    // Subscribe to changes in public:messages (so the channel list updates when someone sends a message)
    const messagesSubscription = supabase
      .channel('public:chat_global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchChannels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsSubscription);
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(messagesSubscription);
      // Clear active chat on unmount
      setActiveChatId(null);
    };
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      
      // Mark this chat as read and set it as active
      if (user) {
        setActiveChatId(selectedChannel.id);
        markChatAsRead(selectedChannel.id, user.id);
      }
      
      // Subscribe to real-time messages in this channel!
      const messagesChannel = supabase
        .channel(`chat_messages:${selectedChannel.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChannel.id}` },
          async (payload) => {
            const msgId = payload.new.id;
            
            // Build sender info dynamically in-memory to prevent separate select queries!
            let msgSender = null;
            if (payload.new.sender_id === user?.id) {
              msgSender = {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url,
                email: user.email,
                phone: user.phone || ''
              };
            } else if (user?.role === 'ADMIN') {
              const part = selectedChannel.student || selectedChannel.teacher;
              if (part && part.id === payload.new.sender_id) {
                msgSender = part;
              }
            } else if (adminProfile) {
              msgSender = {
                id: payload.new.sender_id,
                full_name: adminProfile.full_name,
                role: 'ADMIN',
                avatar_url: adminProfile.avatar_url,
                email: adminProfile.email,
                phone: adminProfile.phone || ''
              };
            }

            const newMsg: ChatMessage = {
              id: msgId,
              chat_id: payload.new.chat_id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              created_at: payload.new.created_at,
              sender: msgSender as any,
              attachments: []
            };

            setMessages((prev) => {
              // 1. Deduplicate by message ID
              if (prev.some(m => m.id === msgId)) return prev;

              // 2. Filter out any optimistic temporary message with the same content/sender
              const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id));
              return [...filtered, newMsg];
            });

            scrollToBottom();

            // Background fetch attachments if they exist (unblocked initial text render!)
            try {
              const { data: attachments } = await supabase
                .from('message_attachments')
                .select('*')
                .eq('message_id', msgId);

              if (attachments && attachments.length > 0) {
                setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, attachments } : m));
              }
            } catch (err) {
              console.error('Failed to load message attachments in background:', err);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    } else {
      setMessages([]);
    }
  }, [selectedChannel]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
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
          student:users!student_id(
            *,
            student_promotions(class_id)
          ),
          teacher:users!teacher_id(*),
          messages(id, sender_id)
        `);

      // RLS policies are applied automatically:
      // Students see only their student_id = auth.uid()
      // Teachers see only their teacher_id = auth.uid()
      // Admins see all.
      if (user.role === 'STUDENT') {
        query = query.eq('student_id', user.id);
      } else if (user.role === 'TEACHER') {
        query = query.eq('teacher_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const formatted = (data || []) as ChatChannel[];
      setChannels(formatted);

      // If user is not Admin and has no chat channel yet, let's auto-create it!
      if (user.role !== 'ADMIN') {
        if (formatted.length === 0) {
          await handleAutoCreateChannel();
        } else if (!selectedChannel) {
          setSelectedChannel(formatted[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
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
        // If conflict on unique constraint, just fetch the existing channel
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          const { data: existingData, error: existingError } = await supabase
            .from('chats')
            .select(`
              *,
              student:users!student_id(*),
              teacher:users!teacher_id(*)
            `)
            .match(payload)
            .single();
            
          if (!existingError && existingData) {
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
    } catch (err: any) {
      console.error('Failed to auto-create chat channel:', err);
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    let category: 'image' | 'pdf' | 'document' = 'document';

    if (file.type.startsWith('image/')) {
      category = 'image';
    } else if (file.type === 'application/pdf') {
      category = 'pdf';
    }

    setAttachedFiles([{ file, category }]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if ((!textToSend && attachedFiles.length === 0) || !selectedChannel || !user) return;

    // Capture files to upload
    const filesToUpload = [...attachedFiles];

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chat_id: selectedChannel.id,
      sender_id: user.id,
      content: textToSend,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        email: user.email,
        phone: user.phone || ''
      },
      attachments: filesToUpload.map((af, idx) => ({
        id: `temp-att-${idx}-${Date.now()}`,
        message_id: tempId,
        file_name: af.file.name,
        file_url: URL.createObjectURL(af.file), // Local Blob URL for instant visual preview
        file_type: af.category,
        file_size: af.file.size,
        created_at: new Date().toISOString()
      }))
    };

    // 1. Instantly append to UI without waiting for database write!
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setAttachedFiles([]);
    scrollToBottom();

    // 2. Perform database write in background
    try {
      if (filesToUpload.length > 0) {
        setUploadingFile(true);
      }

      // Insert core message
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChannel.id,
          sender_id: user.id,
          content: textToSend,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Deduplicate/replace matching optimistic message with real message
      setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, id: msgData.id, created_at: msgData.created_at } : m));

      // Handle uploads in background if present
      if (filesToUpload.length > 0) {
        const { file, category } = filesToUpload[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `chats/${selectedChannel.id}/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert attachment record into database
        const { data: attachData, error: attachError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: msgData.id,
            file_name: file.name,
            file_url: filePath,
            file_type: category,
            file_size: file.size,
          })
          .select()
          .single();

        if (attachError) throw attachError;

        // Merge real attachment details into message list
        setMessages((prev) => prev.map(m => m.id === msgData.id ? { ...m, attachments: [attachData] } : m));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
      // If error occurs, purge the optimistic message so the user knows it failed
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setUploadingFile(false);
    }
  };

  const getAttachmentPublicUrl = (filePath: string) => {
    if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      return filePath;
    }
    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleCopyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`${fieldName} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      showToast('Failed to copy text', 'error');
    }
  };

  const renderAvatar = (url: string, name: string, sizeClass: string, textClass: string) => {
    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setPreviewAvatar({ url: url || '', name });
        }}
        className={`${sizeClass} rounded-full overflow-hidden border border-white/10 shadow-lg flex-shrink-0 cursor-pointer hover:scale-105 transition-transform flex items-center justify-center`}
      >
        {url && (url.startsWith('http') || url.startsWith('data:')) ? (
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white ${textClass} font-black uppercase`}>
            {name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  };
  const participant = selectedChannel ? (selectedChannel.student || selectedChannel.teacher) : null;

  // Filter channels based on tab, class selection, and message presence (for ADMIN)
  const filteredChannels = channels.filter(chan => {
    // If Admin, only show channels with messages
    if (user?.role === 'ADMIN') {
      const hasMessages = chan.messages && chan.messages.length > 0;
      if (!hasMessages) return false;
    }

    if (chatActiveTab === 'STUDENT') {
      if (!chan.student_id) return false;
      if (selectedClassId !== 'ALL') {
        const studentClassId = 
          (chan.student as any)?.student_promotions?.[0]?.class_id || 
          chan.student?.class_id;
        return studentClassId === selectedClassId;
      }
      return true;
    } else {
      return chan.teacher_id !== null;
    }
  });

  return (
    <div className="w-full flex-1 flex flex-col h-[75vh] md:h-[65vh] select-none bg-background">
      {/* Active Channels layout for Admins / User overview */}
      <div className={`flex-1 flex ${isMobile ? 'flex-col' : 'flex-row'} divide-neutral-border overflow-hidden`}>
        
        {/* Left Side: Chats Channels list */}
        {user?.role === 'ADMIN' && (
          <div className={`${isMobile ? 'w-full' : 'w-64 border-r border-neutral-border/50'} ${isMobile && selectedChannel ? 'hidden' : 'flex'} flex-col h-full overflow-y-auto bg-surface/20`}>
            <div className="p-3.5 border-b border-neutral-border select-none space-y-2.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Inbox Inquiries</span>
              </h3>

              {/* Tabs Grid: Students / Teachers */}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-surface/30 border border-neutral-border/40 select-none">
                 <button
                  onClick={() => {
                    setChatActiveTab('STUDENT');
                    setSelectedChannel(null);
                  }}
                  className={`py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    chatActiveTab === 'STUDENT'
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎓 Students
                </button>
                <button
                  onClick={() => {
                    setChatActiveTab('TEACHER');
                    setSelectedChannel(null);
                  }}
                  className={`py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    chatActiveTab === 'TEACHER'
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🏫 Teachers
                </button>
              </div>

              {/* Conditionally show class selection dropdown if active tab is STUDENT */}
              {chatActiveTab === 'STUDENT' && (
                <div className="flex items-center space-x-2 pt-0.5 animate-fade-in">
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedChannel(null);
                    }}
                    className="w-full glass-input text-[9px] font-bold py-1.5 px-2 bg-background border border-neutral-border/50 text-gray-300 cursor-pointer"
                  >
                    <option value="ALL">Show All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.name} Students</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loadingChannels && channels.length === 0 ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">No active inbox channels</div>
            ) : (
              <div className="divide-y divide-neutral-border/40">
                {filteredChannels.map((chan) => {
                  const participant = chan.student || chan.teacher;
                  const isSelected = selectedChannel?.id === chan.id;
                  const unreadCount = chatUnreadCounts[chan.id] || 0;
                  return (
                    <div
                      key={chan.id}
                      onClick={() => setSelectedChannel(chan)}
                      className={`p-3.5 flex items-center space-x-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-surface/30'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {renderAvatar(participant?.avatar_url || '', participant?.full_name || 'U', 'w-8 h-8', 'text-xs')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{participant?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                          {participant?.phone || 'No Phone'}
                        </p>
                        <span className={`text-[8px] font-bold uppercase tracking-wider block mt-0.5 ${
                          participant?.role === 'TEACHER' ? 'text-primary' : 'text-accent-emerald'
                        }`}>
                          {participant?.role}
                        </span>
                      </div>
                      {/* WhatsApp-style unread count badge */}
                      {unreadCount > 0 && (
                        <div className="flex-shrink-0">
                          <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-accent-emerald text-white text-[10px] font-black px-1.5 shadow-lg shadow-accent-emerald/30 animate-scale-in">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Side: Message Thread View */}
        <div className={`flex-1 flex-col h-full bg-background overflow-hidden relative ${isMobile && !selectedChannel ? 'hidden' : 'flex'}`}>
          {selectedChannel ? (
            <>
              {/* Active channel header */}
              <div className="p-4 bg-surface/35 border-b border-neutral-border flex items-center justify-between relative z-30">
                <div className="flex items-center space-x-3">
                  {user?.role === 'ADMIN' && isMobile && (
                    <button 
                      onClick={() => setSelectedChannel(null)}
                      className="p-1.5 rounded-xl hover:bg-surface/50 text-gray-400 hover:text-white transition-colors cursor-pointer mr-1 flex items-center justify-center border border-white/5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  
                  {user?.role === 'ADMIN' ? (
                    <>
                      <div className="flex-shrink-0">
                        {renderAvatar(participant?.avatar_url || '', participant?.full_name || 'U', 'w-8 h-8', 'text-xs')}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                          <span>{participant?.full_name}</span>
                          {participant?.phone && (
                            <span className="text-[10px] font-normal text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                              {participant?.phone}
                            </span>
                          )}
                        </h4>
                        <p className="text-[9px] text-gray-500 mt-0.5">Real-time correspondence active • {participant?.role}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-shrink-0">
                        {renderAvatar(adminProfile?.avatar_url || '', adminProfile?.full_name || 'Admin', 'w-8 h-8', 'text-xs')}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {adminProfile?.full_name || 'School Secretary'}
                        </h4>
                        <p className="text-[9px] text-gray-500 mt-0.5">School Secretary • Online</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Dropdown popup trigger for Students and Teachers */}
                {user?.role !== 'ADMIN' && adminProfile && (
                  <button
                    type="button"
                    onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                    className="px-3 py-1.5 rounded-xl bg-surface/50 border border-neutral-border text-gray-400 hover:text-white hover:border-primary transition-all flex items-center space-x-1.5 text-[10px] font-bold cursor-pointer active:scale-95"
                  >
                    <span>Secretary Info</span>
                    {isAdminDropdownOpen ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Admin Contact Details - Dropdown Popup Screen for Students & Teachers */}
              {user?.role !== 'ADMIN' && adminProfile && isAdminDropdownOpen && (
                <>
                  {/* Backdrop overlay */}
                  <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 transition-all duration-300 animate-fade-in"
                    onClick={() => setIsAdminDropdownOpen(false)}
                  />
                  
                  {/* Dropdown Popup Card */}
                  <div className="absolute top-[72px] left-4 right-4 z-40 bg-[#0d1122] border border-neutral-border/60 rounded-2xl p-5 shadow-glow shadow-primary/20 backdrop-blur-md animate-slide-down flex flex-col items-center select-none">
                    <button
                      type="button"
                      onClick={() => setIsAdminDropdownOpen(false)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {/* Large profile picture of the Admin */}
                    <div className="relative mb-3">
                      <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-accent-purple shadow-glow-primary">
                        {renderAvatar(adminProfile.avatar_url, adminProfile.full_name || 'Admin', 'w-16 h-16', 'text-xl')}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border border-neutral-border/40 flex items-center justify-center text-[10px] shadow-premium">
                        👑
                      </div>
                    </div>

                    <h5 className="text-sm font-black text-white tracking-wide uppercase">
                      {adminProfile.full_name || 'School Secretary'}
                    </h5>
                    <span className="text-[9px] font-black tracking-widest text-primary uppercase mt-0.5 bg-primary/10 px-2 py-0.5 rounded-full">
                      School Secretary Details
                    </span>

                    {/* Email and Phone rows */}
                    <div className="w-full mt-4 space-y-2.5">
                      {/* Email Row */}
                      {adminProfile.email && (
                        <div className="flex items-center justify-between bg-surface/50 border border-neutral-border/40 rounded-xl px-3 py-2 space-x-3">
                          <div className="min-w-0">
                            <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-wider leading-none font-display">Email Address</span>
                            <span className="text-xs text-white font-bold block mt-1 truncate max-w-[220px]">
                              {adminProfile.email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(adminProfile.email, 'Email')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-gray-400 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
                            title="Copy Email"
                          >
                            {copiedField === 'Email' ? (
                              <Check className="w-4 h-4 text-accent-emerald animate-bounce" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Phone Row */}
                      {adminProfile.phone && (
                        <div className="flex items-center justify-between bg-surface/50 border border-neutral-border/40 rounded-xl px-3 py-2 space-x-3">
                          <div className="min-w-0">
                            <span className="block text-[8px] text-gray-500 font-extrabold uppercase tracking-wider leading-none font-display">Phone Contact</span>
                            <span className="text-xs text-white font-bold block mt-1 truncate">
                              {adminProfile.phone}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(adminProfile.phone, 'Phone')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-gray-400 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center justify-center flex-shrink-0"
                            title="Copy Phone Number"
                          >
                            {copiedField === 'Phone' ? (
                              <Check className="w-4 h-4 text-accent-emerald animate-bounce" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Message balloons list */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#080B15]">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-gray-700 animate-pulse" />
                    <p className="text-xs font-bold text-white">Start the conversation</p>
                    <p className="text-[9px] text-gray-500">Type a message below to connect instantly with the school board.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          isOwn ? 'ml-auto items-end animate-slide-up' : 'mr-auto items-start'
                        }`}
                      >
                        {/* Message Sender name if not own */}
                        {!isOwn && (
                          <span className="text-[8px] font-bold text-gray-500 mb-1 select-none">
                            {msg.sender?.full_name}
                          </span>
                        )}

                        {/* Balloon body */}
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isOwn 
                            ? 'bg-primary text-white rounded-tr-none shadow-glow-primary' 
                            : 'bg-surface border border-neutral-border text-gray-200 rounded-tl-none'
                        }`}>
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                          {/* Render Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                              {msg.attachments.map((file) => (
                                <a
                                  key={file.id}
                                  href={getAttachmentPublicUrl(file.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 bg-black/25 hover:bg-black/40 p-2 rounded-xl text-[10px] text-white transition-colors cursor-pointer"
                                >
                                  {file.file_type === 'image' ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-accent-emerald flex-shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-accent-gold flex-shrink-0" />
                                  )}
                                  <span className="truncate flex-1 max-w-[140px]">{file.file_name}</span>
                                  <Download className="w-3 h-3 text-gray-400" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Date stamps */}
                        <span className="text-[7px] text-gray-500 mt-1 select-none">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input panel */}
              <form onSubmit={handleSendMessage} className="p-3 bg-surface/50 border-t border-neutral-border flex flex-col space-y-2 z-30">
                {/* Pending file uploads indicator */}
                {attachedFiles.length > 0 && (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2 rounded-xl text-[10px] text-primary">
                    <div className="flex items-center space-x-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="font-bold truncate max-w-[200px]">{attachedFiles[0].file.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttachedFiles([])}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttach}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl bg-neutral-border text-gray-400 hover:text-white hover:bg-surface transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder="Type message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 glass-input py-3"
                  />

                  <button
                    type="submit"
                    disabled={uploadingFile || (!inputText.trim() && attachedFiles.length === 0)}
                    className="p-3 rounded-xl bg-primary text-white shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex-shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <AlertCircle className="w-10 h-10 text-gray-700 animate-pulse" />
              <p className="text-xs font-bold text-white">Select inquiry chat</p>
              <p className="text-[9px] text-gray-500 max-w-[200px]">Choose an active student/teacher thread from the left list to begin replying.</p>
            </div>
          )}
        </div>

      </div>

      {/* WHATSAPP-STYLE FULL SCREEN IMAGE PREVIEW MODAL */}
      {previewAvatar && (
        <div 
          onClick={() => setPreviewAvatar(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in cursor-pointer select-none"
        >
          <button 
            onClick={() => setPreviewAvatar(null)} 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel max-w-[320px] sm:max-w-[400px] w-full aspect-square overflow-hidden rounded-2xl border border-white/10 shadow-glow-primary animate-scale-in relative cursor-default"
          >
            {previewAvatar.url && (previewAvatar.url.startsWith('http') || previewAvatar.url.startsWith('data:')) ? (
              <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white text-5xl font-black uppercase">
                {previewAvatar.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-bold text-white uppercase tracking-wider font-display">{previewAvatar.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};
