import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

/**
 * Tracks "last read" timestamps per chat in localStorage.
 * Any message created AFTER the stored timestamp is "unread".
 * When a chat is opened, the timestamp is bumped to now → badges vanish.
 */

const STORAGE_KEY = 'academix_last_read';

/** Read the persisted map { chatId: isoTimestamp } */
function getLastReadMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist the map back */
function saveLastReadMap(map: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* quota exceeded – degrade gracefully */ }
}

interface UnreadState {
  /** For non-admin users: total unread messages from admin */
  totalUnread: number;
  /** For admin: per-chat unread counts keyed by chat_id */
  chatUnreadCounts: Record<string, number>;
  /** The chat_id currently being viewed */
  activeChatId: string | null;

  setActiveChatId: (chatId: string | null) => void;
  fetchUnreadCounts: (userId: string, role: string) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => void;
  handleNewMessage: (chatId: string, senderId: string, messageId: string, currentUserId: string, currentRole: string) => void;
  resetUnread: () => void;
}

export const useChatStore = create<UnreadState>((set, get) => ({
  totalUnread: 0,
  chatUnreadCounts: {},
  activeChatId: null,

  setActiveChatId: (chatId) => {
    set({ activeChatId: chatId });
  },

  fetchUnreadCounts: async (userId: string, role: string) => {
    try {
      const lastReadMap = getLastReadMap();
      let mapUpdated = false;

      if (role === 'ADMIN') {
        // Admin sees all chats – count messages NOT sent by admin that arrived
        // after the admin last read each chat.
        const { data: chats } = await supabase
          .from('chats')
          .select('id');

        if (!chats || chats.length === 0) {
          set({ chatUnreadCounts: {} });
          return;
        }

        // Auto-seed any chats that have no lastRead timestamp yet.
        // This means existing messages are treated as "already read",
        // and only NEW messages arriving after this point will show badges.
        const now = new Date().toISOString();
        for (const chat of chats) {
          if (!lastReadMap[chat.id]) {
            lastReadMap[chat.id] = now;
            mapUpdated = true;
          }
        }
        if (mapUpdated) saveLastReadMap(lastReadMap);

        const counts: Record<string, number> = {};

        // Fetch all messages not sent by admin
        const { data: messages } = await supabase
          .from('messages')
          .select('id, chat_id, created_at')
          .neq('sender_id', userId)
          .order('created_at', { ascending: false });

        if (messages) {
          for (const msg of messages) {
            const lastRead = lastReadMap[msg.chat_id];
            // Only count if message is strictly newer than lastRead
            if (lastRead && msg.created_at > lastRead) {
              counts[msg.chat_id] = (counts[msg.chat_id] || 0) + 1;
            }
          }
        }

        set({ chatUnreadCounts: counts });
      } else {
        // Student/Teacher: count messages from others (admin) in their chats
        const { data: chats } = await supabase
          .from('chats')
          .select('id')
          .or(`student_id.eq.${userId},teacher_id.eq.${userId}`);

        if (!chats || chats.length === 0) {
          set({ totalUnread: 0 });
          return;
        }

        // Auto-seed chats with no stored timestamp
        const now = new Date().toISOString();
        for (const chat of chats) {
          if (!lastReadMap[chat.id]) {
            lastReadMap[chat.id] = now;
            mapUpdated = true;
          }
        }
        if (mapUpdated) saveLastReadMap(lastReadMap);

        const chatIds = chats.map(c => c.id);

        const { data: messages } = await supabase
          .from('messages')
          .select('id, chat_id, created_at')
          .in('chat_id', chatIds)
          .neq('sender_id', userId);

        if (messages) {
          let unread = 0;
          for (const msg of messages) {
            const lastRead = lastReadMap[msg.chat_id];
            if (lastRead && msg.created_at > lastRead) {
              unread++;
            }
          }
          set({ totalUnread: unread });
        } else {
          set({ totalUnread: 0 });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch unread counts:', err);
    }
  },

  markChatAsRead: (chatId: string, _userId: string) => {
    // Bump the "last read" timestamp for this chat to NOW
    const map = getLastReadMap();
    map[chatId] = new Date().toISOString();
    saveLastReadMap(map);

    // Immediately zero out the badge for this specific chat
    set(state => {
      const removedCount = state.chatUnreadCounts[chatId] || 0;
      const newCounts = { ...state.chatUnreadCounts };
      delete newCounts[chatId];

      return {
        chatUnreadCounts: newCounts,
        totalUnread: Math.max(0, state.totalUnread - removedCount),
      };
    });
  },

  handleNewMessage: (chatId: string, senderId: string, _messageId: string, currentUserId: string, currentRole: string) => {
    // Ignore own messages
    if (senderId === currentUserId) return;

    const state = get();

    // If user is currently viewing this chat, auto-read it
    if (state.activeChatId === chatId) {
      // Bump the last-read timestamp so it stays marked read
      const map = getLastReadMap();
      map[chatId] = new Date().toISOString();
      saveLastReadMap(map);
      return;
    }

    // Otherwise increment the unread badge
    if (currentRole === 'ADMIN') {
      set(state => ({
        chatUnreadCounts: {
          ...state.chatUnreadCounts,
          [chatId]: (state.chatUnreadCounts[chatId] || 0) + 1,
        },
      }));
    } else {
      set(state => ({
        totalUnread: state.totalUnread + 1,
      }));
    }
  },

  resetUnread: () => {
    set({
      totalUnread: 0,
      chatUnreadCounts: {},
      activeChatId: null,
    });
  },
}));
