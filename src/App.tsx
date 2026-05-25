import React from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { AppShell } from './layouts/AppShell';
import { Login } from './features/auth/Login';
import { Dashboard } from './features/dashboard/Dashboard';
import { Notices } from './features/notices/Notices';
import { Syllabus } from './features/syllabus/Syllabus';
import { Chat } from './features/chat/Chat';
import { Profile } from './features/profile/Profile';
import { Members } from './features/members/Members';


const App: React.FC = () => {
  const { user } = useAuthStore();
  const { activeView } = useUIStore();

  return (
    <AppShell>
      {!user ? (
        <Login />
      ) : (
        <div className="w-full h-full flex flex-col flex-1">
          <div style={{ display: activeView === 'dashboard' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Dashboard />
          </div>
          <div style={{ display: activeView === 'notices' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Notices />
          </div>
          <div style={{ display: activeView === 'syllabus' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Syllabus />
          </div>
          <div style={{ display: activeView === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Chat />
          </div>
          <div style={{ display: activeView === 'members' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Members />
          </div>
          <div style={{ display: activeView === 'profile' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
            <Profile />
          </div>

        </div>
      )}
    </AppShell>
  );
};

export default App;
