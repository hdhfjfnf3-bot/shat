import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, Message, User, CURRENT_USER, MessageStatus } from "./types";
import { seedConversations, seedMessages } from "./seed";
import { simulateBotReply } from "./bot";

interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string, type?: "text" | "image" | "like", replyToId?: string) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => void;
  addReaction: (conversationId: string, messageId: string, emoji: string) => void;
  unsendMessage: (conversationId: string, messageId: string) => void;
  markAsRead: (conversationId: string) => void;
  receiveMessage: (conversationId: string, message: Message) => void;
  resetDemo: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: seedConversations,
      messages: seedMessages,
      activeConversationId: null,

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) {
          get().markAsRead(id);
        }
      },

      sendMessage: (conversationId, content, type = "text", replyToId) => {
        const id = Math.random().toString(36).substring(7);
        const newMessage: Message = {
          id,
          conversationId,
          senderId: CURRENT_USER.id,
          type,
          content,
          status: "sending",
          createdAt: new Date().toISOString(),
          reactions: [],
          replyToId,
        };

        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, newMessage],
            },
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...state.conversations[conversationId],
                lastMessage: newMessage,
              },
            },
          };
        });

        // Simulate network
        setTimeout(() => get().updateMessageStatus(conversationId, id, "sent"), 300);
        setTimeout(() => get().updateMessageStatus(conversationId, id, "delivered"), 600);

        // Trigger bot reply
        const conv = get().conversations[conversationId];
        const otherId = conv?.participants.find((p) => p !== CURRENT_USER.id) ?? "1";
        simulateBotReply(
          conversationId,
          content,
          get().receiveMessage,
          (cId, mId) => get().updateMessageStatus(cId, mId, "seen"),
          undefined,
          id,
          otherId,
        );
      },

      updateMessageStatus: (conversationId, messageId, status) => {
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: conversationMessages.map((m) =>
                m.id === messageId ? { ...m, status } : m
              ),
            },
          };
        });
      },

      addReaction: (conversationId, messageId, emoji) => {
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: conversationMessages.map((m) => {
                if (m.id === messageId) {
                  const existing = m.reactions.find(r => r.userId === CURRENT_USER.id && r.emoji === emoji);
                  if (existing) {
                    return { ...m, reactions: m.reactions.filter(r => r !== existing) };
                  }
                  return { ...m, reactions: [...m.reactions, { userId: CURRENT_USER.id, emoji }] };
                }
                return m;
              }),
            },
          };
        });
      },

      unsendMessage: (conversationId, messageId) => {
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: conversationMessages.map((m) =>
                m.id === messageId ? { ...m, isUnsent: true } : m
              ),
            },
          };
        });
      },

      markAsRead: (conversationId) => {
        set((state) => {
          const conv = state.conversations[conversationId];
          if (!conv || conv.unreadCount === 0) return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: { ...conv, unreadCount: 0 },
            },
          };
        });
      },

      receiveMessage: (conversationId, message) => {
        set((state) => {
          const conversationMessages = state.messages[conversationId] || [];
          const conv = state.conversations[conversationId];
          const isUnread = state.activeConversationId !== conversationId;
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...conversationMessages, message],
            },
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conv,
                lastMessage: message,
                unreadCount: isUnread ? conv.unreadCount + 1 : 0,
              },
            },
          };
        });
      },

      resetDemo: () => {
        set({ conversations: seedConversations, messages: seedMessages, activeConversationId: null });
      },
    }),
    {
      name: "ig-direct-storage",
    }
  )
);
