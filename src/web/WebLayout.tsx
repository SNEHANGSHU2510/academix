import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useChatStore } from '../store/useChatStore';
import { WebDashboard } from './WebDashboard';
import { WebChat } from './WebChat';
import { WebNotices } from './WebNotices';
import { WebSyllabus } from './WebSyllabus';
import { WebMembers } from './WebMembers';
import { WebProfile } from './WebProfile';
import { 
  LayoutDashboard, 
  Megaphone, 
  MessageSquare, 
  Calendar,
  BookOpen,
  Users,
  LogOut,
  Bell,
  User
} from 'lucide-react';

export const WebLayout: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { activeView, setActiveView, activeSession } = useUIStore();
  const { totalUnread } = useChatStore();

  const handleSignOut = () => {
    signOut();
  };

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
        { id: 'profile', label: 'Profile', icon: User },
      ];
    } else if (user.role === 'TEACHER') {
      return [
        ...base,
        { id: 'syllabus', label: 'Schedule', icon: Calendar },
        { id: 'chat', label: 'Messages', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    } else {
      return [
        ...base,
        { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (viewId: any) => {
    setActiveView(viewId);
    if (viewId === 'chat' && user && user.role !== 'ADMIN') {
      useChatStore.getState().markChatAsRead('__all__', user.id);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <WebDashboard />;
      case 'chat':
        return <WebChat />;
      case 'notices':
        return <WebNotices />;
      case 'syllabus':
        return <WebSyllabus />;
      case 'members':
        return <WebMembers />;
      case 'profile':
        return <WebProfile />;
      default:
        return <WebDashboard />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative text-white font-body selection:bg-primary/30 selection:text-primary-50">
      {/* Decorative Ambient Light Mesh Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#163832]/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8EB69B]/10 blur-[120px] pointer-events-none z-0" />

      {/* Top Header */}
      <header className="h-16 w-full border-b border-white/5 bg-surface/50 backdrop-blur-xl flex items-center justify-between px-6 z-20 relative">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-display font-extrabold tracking-wider bg-gradient-to-r from-[#DAF1DE] to-[#8EB69B] bg-clip-text text-transparent">
            CSPI Web Portal
          </h1>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10 font-bold">
            <Calendar className="w-3 h-3" />
            <span>Session: {activeSession?.name || 'Loading...'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <button className="relative text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-rose rounded-full border-2 border-background"></span>
          </button>
          
          <div 
            onClick={() => setActiveView('profile')}
            className="flex items-center space-x-3 pl-6 border-l border-white/10 cursor-pointer group"
          >
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
              user.role === 'ADMIN' ? 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20' :
              user.role === 'TEACHER' ? 'bg-primary/10 text-primary border border-primary/20' :
              'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
            }`}>
              {user.role}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{user.full_name}</span>
              <span className="text-[10px] text-gray-400 font-medium">Logged in</span>
            </div>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-9 h-9 rounded-full border border-white/10 shadow-lg object-cover group-hover:border-primary/50 transition-colors" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-extrabold text-sm text-primary font-display group-hover:border-primary/50 transition-colors">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 flex overflow-hidden z-10 relative">
        
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-white/5 bg-surface/30 backdrop-blur-md flex flex-col justify-between py-6">
          <div className="px-4 space-y-1">
            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-4 px-2">Navigation Menu</p>
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
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-glow-primary' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
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

          <div className="px-4 mt-8">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-accent-rose/80 hover:text-accent-rose hover:bg-accent-rose/10 border border-transparent transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Secure Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Content Plate */}
        <main className="flex-1 overflow-y-auto bg-transparent relative">
          {renderContent()}
        </main>
        
      </div>
    </div>
  );
};
