import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useChatStore } from '../store/useChatStore';
import { WebLogin } from './WebLogin';
import { WebLayout } from './WebLayout';
import { Loader2 } from 'lucide-react';

export const WebApp: React.FC = () => {
  const { user, initialized, initialize } = useAuthStore();
  const { fetchConfiguration } = useUIStore();
  const { fetchUnreadCounts } = useChatStore();

  useEffect(() => {
    initialize();
    fetchConfiguration();
  }, [initialize, fetchConfiguration]);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts(user.id, user.role);
    }
  }, [user?.id, fetchUnreadCounts, user?.role]);

  // Loading screen removed for instant reload

  return user ? <WebLayout /> : <WebLogin />;
};
