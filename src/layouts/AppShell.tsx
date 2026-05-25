import React, { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useChatStore } from '../store/useChatStore';
import { supabase } from '../lib/supabaseClient';
import { 
  LayoutDashboard, 
  Megaphone, 
  MessageSquare, 
  User, 
  Smartphone, 
  Monitor,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  BookOpen,
  Users,
  X
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, initialized, initialize } = useAuthStore();
  const { 
    activeView, 
    setActiveView, 
    toast, 
    clearToast, 
    phonePreviewMode, 
    setPhonePreviewMode,
    loading,
    fetchConfiguration,
    activeSession
  } = useUIStore();
  const { totalUnread, fetchUnreadCounts, messageNotification, showMessageNotification, dismissMessageNotification } = useChatStore();

  useEffect(() => {
    initialize();
    fetchConfiguration();
  }, []);

  // Fetch unread counts when user logs in & subscribe to real-time messages
  useEffect(() => {
    if (!user) return;

    // Initial fetch of unread counts
    fetchUnreadCounts(user.id, user.role);

    // Subscribe to new messages for live badge updates + popup notifications
    const unreadChannel = supabase
      .channel('global_unread_badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.sender_id !== user.id) {
            fetchUnreadCounts(user.id, user.role);

            // Fetch sender details for popup notification
            try {
              const { data: sender } = await supabase
                .from('users')
                .select('full_name, avatar_url')
                .eq('id', newMsg.sender_id)
                .single();

              if (sender) {
                // Don't show popup if user is already viewing this chat
                const currentActiveChatId = useChatStore.getState().activeChatId;
                if (currentActiveChatId === newMsg.chat_id) return;

                showMessageNotification({
                  senderName: sender.full_name || 'Unknown',
                  senderAvatar: sender.avatar_url || '',
                  preview: newMsg.content ? (newMsg.content.length > 60 ? newMsg.content.slice(0, 60) + '...' : newMsg.content) : '📎 Sent an attachment',
                  chatId: newMsg.chat_id,
                  timestamp: Date.now(),
                });
              }
            } catch (err) {
              // Notification fetch failed silently — badges still work
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(unreadChannel);
    };
  }, [user?.id]);

  const handleNotificationClick = useCallback(() => {
    if (!messageNotification) return;
    dismissMessageNotification();
    // Navigate to chat view
    setActiveView('chat');
    // Store the target chatId so Chat component can auto-select it
    // We use a custom event to communicate with the Chat component
    window.dispatchEvent(new CustomEvent('open-chat', { detail: { chatId: messageNotification.chatId } }));
  }, [messageNotification, dismissMessageNotification, setActiveView]);

  // We removed the blocking initialized screen to make reloading instant

  // Define nav links based on role
  const getNavItems = () => {
    if (!user) return [];
    
    const base = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'notices', label: 'Notices', icon: Megaphone },
    ];

    if (user.role === 'ADMIN') {
      return [
        ...base,
        { id: 'syllabus', label: 'Academics', icon: BookOpen },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'profile', label: 'Account', icon: User },
      ];
    } else if (user.role === 'TEACHER') {
      return [
        ...base,
        { id: 'syllabus', label: 'Schedule', icon: Calendar },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'profile', label: 'Account', icon: User },
      ];
    } else { // STUDENT
      return [
        ...base,
        { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'profile', label: 'Account', icon: User },
      ];
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (viewId: any) => {
    setActiveView(viewId);
    // When clicking on chat, clear unread for non-admin users
    if (viewId === 'chat' && user && user.role !== 'ADMIN') {
      useChatStore.getState().markChatAsRead('__all__', user.id);
    }
  };



  const renderContent = () => {
    return (
      <div className="relative w-full flex-1 min-h-0 flex flex-col">
        {children}
        {loading && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-xs z-50 flex items-center justify-center animate-fade-in">
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center shadow-premium animate-scale-in">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-white text-sm font-medium">Synchronizing Database...</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen md:h-auto md:min-h-screen w-screen bg-background flex flex-col items-center justify-center overflow-hidden md:overflow-visible p-0 sm:p-4 md:p-8 relative">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#163832]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8EB69B]/10 blur-[120px] pointer-events-none" />

      {/* Simulator Toggle Button (Desktop Only) */}
      <div className="hidden md:flex absolute top-6 right-8 z-50 items-center space-x-2 bg-surface/80 border border-neutral-border p-1.5 rounded-full shadow-lg backdrop-blur-md">
        <button
          onClick={() => setPhonePreviewMode(true)}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            phonePreviewMode 
              ? 'bg-primary text-white shadow-glow-primary' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile Device</span>
        </button>
        <button
          onClick={() => setPhonePreviewMode(false)}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            !phonePreviewMode 
              ? 'bg-primary text-white shadow-glow-primary' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Browser</span>
        </button>
      </div>

      {/* Main Core Layout */}
      {phonePreviewMode ? (
        <div className="phone-simulator-shell relative flex flex-col shadow-premium animate-fade-in">
          {/* Simulated Mobile Status Bar (Desktop Simulator only) */}
          <div className="hidden md:flex w-full bg-[#051F20] text-neutral-muted px-6 py-2.5 items-center justify-between text-[11px] font-semibold tracking-wider select-none border-b border-neutral-border/20 z-40 relative">
            <span className="text-neutral-text">10:56 AM</span>
            {/* Dynamic Simulated Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-b-2xl flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800" />
            </div>
            <div className="flex items-center space-x-2">
              <span>LTE</span>
              <div className="w-5 h-2.5 border border-gray-500 rounded-sm p-0.5 flex items-center">
                <div className="w-3 h-full bg-emerald-500 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Simulated App Header with Active Session Info — Dashboard Only */}
          {user && activeView === 'dashboard' && (
            <div className="w-full px-5 py-3.5 flex items-center justify-between bg-surface border-b border-neutral-border z-30 select-none">
              <div>
                <h1 className="text-sm font-display font-extrabold tracking-tight bg-gradient-to-r from-[#DAF1DE] to-[#8EB69B] bg-clip-text text-transparent">
                  CSPI Hub
                </h1>
                <div className="flex items-center space-x-1 text-[10px] text-primary mt-0.5 font-bold">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Session: {activeSession?.name || 'Loading...'}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                  user.role === 'ADMIN' ? 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20' :
                  user.role === 'TEACHER' ? 'bg-primary/10 text-primary border border-primary/20' :
                  'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                }`}>
                  {user.role}
                </span>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-7 h-7 rounded-full border border-neutral-border shadow-md" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-extrabold text-xs text-primary font-display">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Screen Context */}
          <div className={`phone-simulator-screen relative flex-1 flex flex-col bg-background min-h-0 ${activeView === 'chat' ? 'chat-active' : ''}`}>
            {renderContent()}
          </div>

          {/* Simulated Bottom Navigation */}
          {user && (
            <div className="h-[68px] glass-panel border-t border-neutral-border/50 flex items-center justify-around px-2 py-2 z-40 select-none flex-shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const isChatIcon = item.id === 'chat';
                const showBadge = isChatIcon && totalUnread > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className="flex flex-col items-center justify-center w-12 py-1 relative group cursor-pointer transition-all duration-300"
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 transition-transform duration-300 ${
                        isActive ? 'text-primary scale-110' : 'text-gray-500 group-hover:text-gray-300'
                      }`} />
                      {showBadge && (
                        <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-rose text-white text-[9px] font-black px-1 shadow-lg shadow-accent-rose/40 animate-scale-in border-2 border-background">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] font-medium tracking-wide mt-1 transition-colors duration-300 ${
                      isActive ? 'text-primary font-bold' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 w-4 h-0.5 bg-primary rounded-full shadow-glow-primary animate-fade-in" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-6xl min-h-[85vh] glass-panel rounded-3xl flex flex-col justify-between shadow-premium overflow-hidden border border-neutral-border animate-fade-in relative z-20">
          {/* Desktop Header — Dashboard Only */}
          {user && activeView === 'dashboard' && (
            <div className="w-full px-8 py-4 flex items-center justify-between bg-surface/50 border-b border-neutral-border select-none">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-display font-extrabold tracking-wider bg-gradient-to-r from-[#DAF1DE] to-[#8EB69B] bg-clip-text text-transparent">
                  CSPI Portal
                </h1>
                <div className="flex items-center space-x-1.5 text-xs text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10 font-bold">
                  <Calendar className="w-3 h-3" />
                  <span>Session: {activeSession?.name || 'Loading...'}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                  user.role === 'ADMIN' ? 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20' :
                  user.role === 'TEACHER' ? 'bg-primary/10 text-primary border border-primary/20' :
                  'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                }`}>
                  {user.role} ROLE
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-neutral-text">{user.full_name}</span>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-full border border-neutral-border shadow-lg" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-extrabold text-sm text-primary font-display">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Content Grid */}
          <div className="flex-1 flex flex-col md:flex-row relative">
            {/* Sidebar Navigation */}
            {user && (
              <div className="w-full md:w-64 bg-surface/20 border-r border-neutral-border/50 p-6 flex flex-col space-y-2 select-none">
                <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-2">Navigation Menu</p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const isChatIcon = item.id === 'chat';
                  const showBadge = isChatIcon && totalUnread > 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer relative ${
                        isActive 
                          ? 'bg-primary text-white shadow-glow-primary' 
                          : 'text-gray-400 hover:text-white hover:bg-surface/40'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-accent-rose text-white text-[8px] font-black px-0.5 shadow-lg shadow-accent-rose/40 animate-scale-in border border-background">
                            {totalUnread > 99 ? '99+' : totalUnread}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content Plate */}
            <div className={`flex-1 bg-background min-h-0 ${
              activeView === 'chat' 
                ? 'overflow-hidden flex flex-col' 
                : 'overflow-y-auto max-h-[70vh] p-6 md:p-8'
            }`}>
              {renderContent()}
            </div>
          </div>
        </div>
      )}

      {/* Global Glass Toast Notification System */}
      {toast && (
        <div className="fixed bottom-24 sm:bottom-8 z-50 flex items-center space-x-3 px-5 py-4 rounded-2xl glass-panel shadow-premium border-l-4 animate-scale-in max-w-sm select-none"
             style={{
               borderLeftColor: 
                 toast.type === 'success' ? '#10B981' : 
                 toast.type === 'error' ? '#F43F5E' : '#6366F1'
             }}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-accent-emerald flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-accent-rose flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-primary flex-shrink-0" />}
          
          <p className="text-xs font-semibold text-white tracking-wide">{toast.message}</p>
          
          <button 
            onClick={clearToast}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer pl-4"
          >
            ×
          </button>
        </div>
      )}
      {/* Incoming Message Popup Notification */}
      {messageNotification && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-[400px] animate-slide-down cursor-pointer select-none"
          onClick={handleNotificationClick}
        >
          <div className="flex items-center space-x-3 px-4 py-3.5 rounded-2xl bg-[#0d1122]/95 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/20">
            {/* Sender Avatar */}
            <div className="flex-shrink-0">
              {messageNotification.senderAvatar && (messageNotification.senderAvatar.startsWith('http') || messageNotification.senderAvatar.startsWith('data:')) ? (
                <img src={messageNotification.senderAvatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary/40 shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent-emerald flex items-center justify-center text-white text-sm font-black uppercase shadow-lg">
                  {messageNotification.senderName.charAt(0)}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-white tracking-wide truncate">{messageNotification.senderName}</p>
                <span className="text-[8px] text-gray-500 ml-2 flex-shrink-0">now</span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5 truncate leading-snug">{messageNotification.preview}</p>
            </div>

            {/* Close button */}
            <button 
              onClick={(e) => { e.stopPropagation(); dismissMessageNotification(); }}
              className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
