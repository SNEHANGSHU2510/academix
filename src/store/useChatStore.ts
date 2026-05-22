import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface MessageNotification {
  senderName: string;
  senderAvatar: string;
  preview: string;
  chatId: string;
  timestamp: number;
}

interface UnreadState {
  /** For non-admin users: total unread messages from admin. For admin: total unread across all chats. */
  totalUnread: number;
  /** Per-chat unread counts keyed by chat_id */
  chatUnreadCounts: Record<string, number>;
  /** The chat_id currently being viewed */
  activeChatId: string | null;
  /** Popup notification for incoming messages */
  messageNotification: MessageNotification | null;

  setActiveChatId: (chatId: string | null) => void;
  fetchUnreadCounts: (userId: string, role: string) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => Promise<void>;
  handleNewMessage: (chatId: string, senderId: string, messageId: string, currentUserId: string, currentRole: string) => void;
  showMessageNotification: (notification: MessageNotification) => void;
  dismissMessageNotification: () => void;
  resetUnread: () => void;
}

let notificationTimer: ReturnType<typeof setTimeout> | null = null;

export const useChatStore = create<UnreadState>((set, get) => ({
  totalUnread: 0,
  chatUnreadCounts: {},
  activeChatId: null,
  messageNotification: null,

  setActiveChatId: (chatId) => {
    set({ activeChatId: chatId });
  },

  showMessageNotification: (notification) => {
    // Clear any existing timer
    if (notificationTimer) clearTimeout(notificationTimer);
    
    set({ messageNotification: notification });
    
    // Auto-dismiss after 5 seconds
    notificationTimer = setTimeout(() => {
      set({ messageNotification: null });
    }, 5000);
  },

  dismissMessageNotification: () => {
    if (notificationTimer) clearTimeout(notificationTimer);
    set({ messageNotification: null });
  },

  fetchUnreadCounts: async (userId: string, role: string) => {
    try {
      if (role === 'ADMIN') {
        // Admin sees all chats – fetch all unread messages sent by others
        const { data: messages, error } = await supabase
          .from('messages')
          .select('chat_id')
          .neq('sender_id', userId)
          .eq('is_read', false);

        if (error) throw error;

        const counts: Record<string, number> = {};
        let total = 0;
        if (messages) {
          for (const msg of messages) {
            counts[msg.chat_id] = (counts[msg.chat_id] || 0) + 1;
            total++;
          }
        }

        set({ chatUnreadCounts: counts, totalUnread: total });
      } else {
        // Student/Teacher: count unread messages in their chats
        const { data: chats, error: chatsError } = await supabase
          .from('chats')
          .select('id')
          .or(`student_id.eq.${userId},teacher_id.eq.${userId}`);

        if (chatsError) throw chatsError;

        if (!chats || chats.length === 0) {
          set({ totalUnread: 0, chatUnreadCounts: {} });
          return;
        }

        const chatIds = chats.map(c => c.id);

        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('chat_id')
          .in('chat_id', chatIds)
          .neq('sender_id', userId)
          .eq('is_read', false);

        if (msgError) throw msgError;

        const counts: Record<string, number> = {};
        let total = 0;
        if (messages) {
          for (const msg of messages) {
            counts[msg.chat_id] = (counts[msg.chat_id] || 0) + 1;
            total++;
          }
        }

        set({ chatUnreadCounts: counts, totalUnread: total });
      }
    } catch (err) {
      console.warn('Failed to fetch unread counts:', err);
    }
  },

  markChatAsRead: async (chatId: string, userId: string) => {
    try {
      // Update database is_read to true for all messages in this chat not sent by user
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state by removing counts for this chat
      set(state => {
        const removedCount = state.chatUnreadCounts[chatId] || 0;
        const newCounts = { ...state.chatUnreadCounts };
        delete newCounts[chatId];

        return {
          chatUnreadCounts: newCounts,
          totalUnread: Math.max(0, state.totalUnread - removedCount),
        };
      });
    } catch (err) {
      console.warn('Failed to mark chat as read:', err);
    }
  },

  handleNewMessage: (chatId: string, senderId: string, _messageId: string, currentUserId: string, currentRole: string) => {
    // If the message is our own, ignore
    if (senderId === currentUserId) return;

    const state = get();
    // If user is currently viewing this chat, it gets marked read immediately
    if (state.activeChatId === chatId) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false)
        .then();
      return;
    }

    // Otherwise refresh counts to sync with DB
    state.fetchUnreadCounts(currentUserId, currentRole);
  },

  resetUnread: () => {
    set({
      totalUnread: 0,
      chatUnreadCounts: {},
      activeChatId: null,
      messageNotification: null,
    });
  },
}));
