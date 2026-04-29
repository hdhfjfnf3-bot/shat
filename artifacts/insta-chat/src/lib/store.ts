import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, Message, User, CURRENT_USER, MessageStatus, VoiceMeta } from "./types";
import { sounds } from "./sounds";

type SendMeta = {
  id: string;
  content: string;
  type: "text" | "image" | "video" | "voice" | "like" | "game" | "theme" | "vanish_mode" | "poll";
  replyToId?: string;
  voice?: VoiceMeta;
  poll?: import("./types").PollMeta;
};

type RealtimeAdapter = {
  sendMessage?: (toUsername: string, msg: SendMeta) => boolean;
  reactMessage?: (peer: string, messageId: string, emoji: string) => boolean;
  unsendMessage?: (peer: string, messageId: string) => boolean;
  sendTyping?: (to: string, isTyping: boolean) => void;
  sendRead?: (to: string) => void;
  deleteConversation?: (to: string) => void;
  editMessage?: (peer: string, messageId: string, content: string) => boolean;
};

const realtime: RealtimeAdapter = {};

export function setRealtimeAdapter(a: RealtimeAdapter) {
  realtime.sendMessage = a.sendMessage;
  realtime.reactMessage = a.reactMessage;
  realtime.unsendMessage = a.unsendMessage;
  realtime.sendTyping = a.sendTyping;
  realtime.sendRead = a.sendRead;
  realtime.deleteConversation = a.deleteConversation;
  realtime.editMessage = a.editMessage;
}

export function sendTypingSignal(to: string, isTyping: boolean) {
  realtime.sendTyping?.(to, isTyping);
}

interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  vanishMode: Record<string, boolean>;
  activeConversationId: string | null;
  replyingTo: Record<string, string | null>;
  editingMessageId: Record<string, string | null>;
  typingPeers: Record<string, boolean>;
  setActiveConversation: (id: string | null) => void;
  setVanishMode: (conversationId: string, isOn: boolean) => void;
  sendMessage: (conversationId: string, content: string, type?: "text" | "image" | "video" | "like" | "voice" | "game" | "theme" | "vanish_mode" | "poll", replyToId?: string, voice?: VoiceMeta, poll?: import("./types").PollMeta) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  setReactions: (conversationId: string, messageId: string, reactions: { userId: string; emoji: string }[]) => void;
  votePoll: (conversationId: string, messageId: string, optionId: string) => void;
  editMessage: (conversationId: string, messageId: string, newContent: string) => void;
  unsendMessage: (conversationId: string, messageId: string) => void;
  markUnsent: (conversationId: string, messageId: string) => void;
  markAsRead: (conversationId: string) => void;
  markPeerRead: (peerUsername: string) => void;
  ingestRemoteMessage: (peerUsername: string, message: Omit<Message, "conversationId" | "status"> & { senderId: string }) => void;
  setReplyingTo: (conversationId: string, messageId: string | null) => void;
  setEditingMessage: (conversationId: string, messageId: string | null) => void;
  ensureConversation: (peerUsername: string) => string;
  createConversation: (username: string) => string;
  setTyping: (peerUsername: string, isTyping: boolean) => void;
  deleteConversation: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;
  clearAll: () => void;
  createGroupConversation: (name: string, usernames: string[]) => string;
  setConversationBackground: (conversationId: string, bgImage: string | undefined, bgOpacity: number | undefined) => void;
}

function makeUser(username: string): User {
  const u = username.toLowerCase();
  return {
    id: u,
    username: u,
    displayName: u.charAt(0).toUpperCase() + u.slice(1),
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=random&color=fff&size=150`,
    isVerified: false,
    isOnline: true,
    lastSeenAt: new Date().toISOString(),
  };
}

// Track when the app started to avoid playing sounds for history messages
const APP_START = Date.now();

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      messages: {},
      vanishMode: {},
      activeConversationId: null,
      replyingTo: {},
      editingMessageId: {},
      typingPeers: {},

      setVanishMode: (conversationId, isOn) => {
        set((state) => ({
          vanishMode: { ...state.vanishMode, [conversationId]: isOn },
        }));
      },

      setReplyingTo: (conversationId, messageId) => {
        set((state) => ({
          replyingTo: { ...state.replyingTo, [conversationId]: messageId },
          editingMessageId: { ...state.editingMessageId, [conversationId]: null },
        }));
      },

      setEditingMessage: (conversationId, messageId) => {
        set((state) => ({
          editingMessageId: { ...state.editingMessageId, [conversationId]: messageId },
          replyingTo: { ...state.replyingTo, [conversationId]: null },
        }));
      },

      setTyping: (peer, isTyping) => {
        const p = peer.toLowerCase();
        if (isTyping && !get().typingPeers[p]) {
          sounds.playTyping();
        }
        set((state) => ({ typingPeers: { ...state.typingPeers, [p]: isTyping } }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) get().markAsRead(id);
      },

      ensureConversation: (peerUsername) => {
        const id = peerUsername.toLowerCase().replace(/^@/, "");
        if (!id) return "";
        const cur = get().conversations[id];
        if (cur) return id;
        const conv: Conversation = {
          id,
          type: "primary",
          participants: [makeUser(id)],
          unreadCount: 0,
          isMuted: false,
          isPinned: false,
          isOnline: true,
          lastActiveAt: new Date().toISOString(),
        };
        set((state) => ({
          conversations: { ...state.conversations, [id]: conv },
          messages: { ...state.messages, [id]: state.messages[id] ?? [] },
        }));
        return id;
      },

      createConversation: (username) => {
        const id = get().ensureConversation(username);
        if (id) set({ activeConversationId: id });
        return id;
      },

      createGroupConversation: (name, usernames) => {
        const id = "group_" + Math.random().toString(36).slice(2, 10);
        const participants = usernames.map(u => makeUser(u));
        
        const conv: Conversation = {
          id,
          type: "primary",
          participants,
          unreadCount: 0,
          isMuted: false,
          isPinned: false,
          isOnline: true,
          lastActiveAt: new Date().toISOString(),
          isGroup: true,
          groupName: name,
        };
        
        set((state) => ({
          conversations: { ...state.conversations, [id]: conv },
          messages: { ...state.messages, [id]: [] },
          activeConversationId: id,
        }));
        
        return id;
      },

      sendMessage: (conversationId, content, type = "text", replyToId, voice, poll) => {
        if (get().replyingTo[conversationId]) {
          set((state) => ({ replyingTo: { ...state.replyingTo, [conversationId]: null } }));
        }
        if (get().editingMessageId[conversationId]) {
          set((state) => ({ editingMessageId: { ...state.editingMessageId, [conversationId]: null } }));
        }
        const me = CURRENT_USER.username;
        const id = Math.random().toString(36).slice(2, 10);
        
        // If vanish mode is on, we don't save standard chat messages to DB! 
        // We still put them in Zustand, but they are ephemeral.
        const isVanishOn = get().vanishMode[conversationId] && type !== "vanish_mode" && type !== "theme";

        const newMessage: Message = {
          id,
          conversationId,
          senderId: me,
          type,
          content,
          status: "sending",
          createdAt: new Date().toISOString(),
          reactions: [],
          replyToId,
          voice,
          poll,
        };

        set((state) => {
          const list = state.messages[conversationId] || [];
          const conv = state.conversations[conversationId];
          return {
            messages: { ...state.messages, [conversationId]: [...list, newMessage] },
            conversations: conv
              ? { ...state.conversations, [conversationId]: { ...conv, lastMessage: newMessage, lastActiveAt: newMessage.createdAt } }
              : state.conversations,
          };
        });

        const sent = realtime.sendMessage?.(conversationId, {
          id,
          content,
          type,
          replyToId,
          voice,
          poll,
        });

        if (sent) {
          sounds.playSend();
          setTimeout(() => get().updateMessageStatus(conversationId, id, "sent"), 200);
        } else {
          setTimeout(() => get().updateMessageStatus(conversationId, id, "sent"), 300);
          setTimeout(() => get().updateMessageStatus(conversationId, id, "delivered"), 600);
        }
      },

      updateMessageStatus: (conversationId, messageId, status) => {
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) => (m.id === messageId ? { ...m, status } : m)),
            },
          };
        });
      },

      toggleReaction: (conversationId, messageId, emoji) => {
        const me = CURRENT_USER.username;
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) => {
                if (m.id !== messageId) return m;
                const cur = m.reactions ?? [];
                const mine = cur.find((r) => r.userId === me);
                let next = cur.filter((r) => r.userId !== me);
                if (!mine || mine.emoji !== emoji) next = [...next, { userId: me, emoji }];
                return { ...m, reactions: next };
              }),
            },
          };
        });
        realtime.reactMessage?.(conversationId, messageId, emoji);
      },

      setReactions: (conversationId, messageId, reactions) => {
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
            },
          };
        });
      },

      votePoll: (conversationId, messageId, optionId) => {
        set((state) => {
          const list = state.messages[conversationId] || [];
          const idx = list.findIndex((m) => m.id === messageId);
          if (idx === -1) return state;
          
          const msg = list[idx];
          if (msg.type !== "poll" || !msg.poll) return state;

          const me = CURRENT_USER.username;
          let newOptions = [...msg.poll.options];
          
          newOptions = newOptions.map(opt => {
            if (opt.id === optionId) {
              if (opt.votes.includes(me)) {
                return { ...opt, votes: opt.votes.filter(id => id !== me) };
              } else {
                return { ...opt, votes: [...opt.votes, me] };
              }
            } else if (!msg.poll!.multipleAnswers) {
              return { ...opt, votes: opt.votes.filter(id => id !== me) };
            }
            return opt;
          });

          const newMsg = { ...msg, poll: { ...msg.poll, options: newOptions } };
          const newList = [...list];
          newList[idx] = newMsg;
          return { messages: { ...state.messages, [conversationId]: newList } };
        });
      },

      unsendMessage: (conversationId, messageId) => {
        get().markUnsent(conversationId, messageId);
        realtime.unsendMessage?.(conversationId, messageId);
      },

      editMessage: (conversationId, messageId, newContent) => {
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            editingMessageId: { ...state.editingMessageId, [conversationId]: null },
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) =>
                m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
              ),
            },
          };
        });
        realtime.editMessage?.(conversationId, messageId, newContent);
      },

      markUnsent: (conversationId, messageId) => {
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) =>
                m.id === messageId ? { ...m, isUnsent: true, content: "", voice: undefined } : m,
              ),
            },
          };
        });
      },

      markAsRead: (conversationId) => {
        set((state) => {
          const conv = state.conversations[conversationId];
          if (!conv || conv.unreadCount === 0) return state;
          realtime.sendRead?.(conversationId);
          return {
            conversations: { ...state.conversations, [conversationId]: { ...conv, unreadCount: 0 } },
          };
        });
      },

      deleteConversation: (conversationId) => {
        set((state) => {
          const { [conversationId]: _, ...restConvs } = state.conversations;
          const { [conversationId]: __, ...restMsgs } = state.messages;
          return { 
            conversations: restConvs, 
            messages: restMsgs, 
            activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId 
          };
        });
        realtime.deleteConversation?.(conversationId);
      },

      toggleMute: (conversationId) => {
        set((state) => {
          const conv = state.conversations[conversationId];
          if (!conv) return state;
          return {
            conversations: { ...state.conversations, [conversationId]: { ...conv, isMuted: !conv.isMuted } }
          };
        });
      },

      markPeerRead: (peerUsername: string) => {
        const convId = peerUsername.toLowerCase();
        let changed = false;
        set((state) => {
          const list = state.messages[convId] || [];
          const nextList = list.map((m) => {
            if (m.senderId === CURRENT_USER.username && (m.status === "sent" || m.status === "delivered")) {
              changed = true;
              return { ...m, status: "seen" as MessageStatus };
            }
            return m;
          });
          if (!changed) return state;
          return { messages: { ...state.messages, [convId]: nextList } };
        });
        if (changed) sounds.playSeen();
      },

      ingestRemoteMessage: (peerUsername, msg) => {
        const me = CURRENT_USER.username;
        const convId = get().ensureConversation(peerUsername);
        const conv = get().conversations[convId];
        const isMuted = conv?.isMuted || false;
        const isOwn = msg.senderId.toLowerCase() === me.toLowerCase();
        const isNew = new Date(msg.createdAt).getTime() > APP_START - 3000;

        // Toggle vanish mode based on remote payload
        if (msg.type === "vanish_mode") {
          get().setVanishMode(convId, msg.content === "on");
        }

        if (!isOwn && isNew && !isMuted && msg.type !== "vanish_mode" && msg.type !== "theme") {
          const isVisible = get().activeConversationId === convId && !document.hidden;
          if (!isVisible) {
            // App is in background or different chat → notification sound + browser notification
            sounds.playNotification();
            if (Notification.permission === "granted") {
              new Notification(`رسالة جديدة من ${peerUsername}`, {
                body: msg.type === "text" ? msg.content :
                      msg.type === "voice" ? "🎤 رسالة صوتية" :
                      msg.type === "image" ? "📷 صورة" :
                      msg.type === "like"  ? "❤️ أرسل لك إعجاب" : "📎 مرفق",
                icon: "/favicon.ico",
                tag: convId, // deduplicate per conversation
              });
            }
          } else {
            // Chat is open → subtle receive sound only
            sounds.playReceive();
            // Automatically mark as read and notify peer
            setTimeout(() => {
              get().markAsRead(convId);
            }, 500);
          }
        }

        set((state) => {
          const list = state.messages[convId] || [];
          if (list.some((m) => m.id === msg.id)) {
            // already have it (echo of our own send) — just mark delivered
            return {
              messages: {
                ...state.messages,
                [convId]: list.map((m) => (m.id === msg.id ? { ...m, status: "delivered" as MessageStatus } : m)),
              },
            };
          }
          const stored: Message = {
            id: msg.id,
            conversationId: convId,
            senderId: msg.senderId.toLowerCase(),
            type: msg.type,
            content: msg.content,
            createdAt: msg.createdAt,
            replyToId: msg.replyToId,
            reactions: msg.reactions ?? [],
            voice: msg.voice,
            status: isOwn ? "delivered" : "delivered",
          };
          const conv = state.conversations[convId];
          const isUnread = !isOwn && state.activeConversationId !== convId;
          return {
            messages: { ...state.messages, [convId]: [...list, stored] },
            conversations: conv
              ? {
                  ...state.conversations,
                  [convId]: {
                    ...conv,
                    lastMessage: stored,
                    lastActiveAt: stored.createdAt,
                    unreadCount: isUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                  },
                }
              : state.conversations,
          };
        });
      },

      setConversationBackground: (conversationId, bgImage, bgOpacity) => {
        set((state) => {
          const c = state.conversations[conversationId];
          if (!c) return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...c,
                bgImage: bgImage !== undefined ? bgImage : c.bgImage,
                bgOpacity: bgOpacity !== undefined ? bgOpacity : c.bgOpacity,
              }
            }
          };
        });
      },

      clearAll: () => {
        set({ conversations: {}, messages: {}, activeConversationId: null, replyingTo: {}, typingPeers: {} });
      },
    }),
    {
      name: "ig-direct-storage",
      version: 4,
      migrate: () => ({
        conversations: {},
        messages: {},
        activeConversationId: null,
        replyingTo: {},
        editingMessageId: {},
        typingPeers: {},
      }) as any,
    },
  ),
);
