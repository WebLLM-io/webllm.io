import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { Conversation, ChatMessage } from './types';
import { loadConversations, saveConversations } from './persistence';

export interface ConversationsSlice {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  _hydrate: () => Promise<void>;
  _persist: () => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const createConversationsSlice: StateCreator<ConversationsSlice, [], [], ConversationsSlice> = (set, get) => ({
  conversations: [],
  activeId: null,

  setActiveId: (id) => set({ activeId: id }),

  createConversation: () => {
    const id = nanoid();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeId: id,
    }));
    get()._persist();
    return id;
  },

  deleteConversation: (id) => {
    set((state) => {
      const filtered = state.conversations.filter((c) => c.id !== id);
      return {
        conversations: filtered,
        activeId: state.activeId === id ? null : state.activeId,
      };
    });
    get()._persist();
  },

  renameConversation: (id, title) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
      ),
    }));
    get()._persist();
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...c.messages, message];
        const title = c.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
          : c.title;
        return { ...c, messages, title, updatedAt: Date.now() };
      }),
    }));
    get()._persist();
  },

  _hydrate: async () => {
    const conversations = await loadConversations();
    set({ conversations });
  },

  _persist: () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveConversations(get().conversations);
    }, 500);
  },
});
