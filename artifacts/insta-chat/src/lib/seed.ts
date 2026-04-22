import { Conversation, Message, User, CURRENT_USER, MessageStatus } from "./types";

const users: Record<string, User> = {
  "1": { id: "1", username: "youssef_99", displayName: "Youssef Ali", avatarUrl: "https://i.pravatar.cc/150?u=1", isVerified: false, isOnline: true, lastSeenAt: new Date().toISOString() },
  "2": { id: "2", username: "dina.art", displayName: "Dina ✨", avatarUrl: "https://i.pravatar.cc/150?u=2", isVerified: false, isOnline: false, lastSeenAt: new Date(Date.now() - 3600000).toISOString() },
  "3": { id: "3", username: "nike", displayName: "Nike", avatarUrl: "https://i.pravatar.cc/150?u=3", isVerified: true, isOnline: true, lastSeenAt: new Date().toISOString() },
  "4": { id: "4", username: "omar.dev", displayName: "Omar", avatarUrl: "https://i.pravatar.cc/150?u=4", isVerified: false, isOnline: true, lastSeenAt: new Date().toISOString() },
  "5": { id: "5", username: "family_group", displayName: "Family ❤️", avatarUrl: "https://i.pravatar.cc/150?u=5", isVerified: false, isOnline: true, lastSeenAt: new Date().toISOString() },
  "6": { id: "6", username: "random_user", displayName: "John Doe", avatarUrl: "https://i.pravatar.cc/150?u=6", isVerified: false, isOnline: false, lastSeenAt: new Date().toISOString() },
};

export const seedConversations: Record<string, Conversation> = {
  "c1": {
    id: "c1",
    type: "primary",
    participants: [users["1"]],
    unreadCount: 0,
    isMuted: false,
    isPinned: true,
    isOnline: true,
    lastActiveAt: new Date().toISOString(),
  },
  "c2": {
    id: "c2",
    type: "primary",
    participants: [users["2"]],
    unreadCount: 1,
    isMuted: false,
    isPinned: false,
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
  },
  "c3": {
    id: "c3",
    type: "general",
    participants: [users["3"]],
    unreadCount: 0,
    isMuted: false,
    isPinned: false,
    isOnline: true,
    lastActiveAt: new Date().toISOString(),
  },
  "c4": {
    id: "c4",
    type: "primary",
    participants: [users["4"]],
    unreadCount: 0,
    isMuted: true,
    isPinned: false,
    isOnline: true,
    lastActiveAt: new Date().toISOString(),
  },
  "c5": {
    id: "c5",
    type: "primary",
    participants: [users["1"], users["2"]], // group
    unreadCount: 3,
    isMuted: false,
    isPinned: false,
    isOnline: true,
    lastActiveAt: new Date().toISOString(),
  },
  "c6": {
    id: "c6",
    type: "requests",
    participants: [users["6"]],
    unreadCount: 1,
    isMuted: false,
    isPinned: false,
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
  },
};

export const seedMessages: Record<string, Message[]> = {
  "c1": [
    { id: "m1", conversationId: "c1", senderId: "1", type: "text", content: "Hey bro! How have you been?", reactions: [], status: "seen", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "m2", conversationId: "c1", senderId: "you", type: "text", content: "I'm doing great! Just working on this new app.", reactions: [], status: "seen", createdAt: new Date(Date.now() - 85000000).toISOString() },
    { id: "m3", conversationId: "c1", senderId: "1", type: "text", content: "عاش يا بطل، شغال في إيه دلوقتي؟", reactions: [{userId: "you", emoji: "❤️"}], status: "seen", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "m4", conversationId: "c1", senderId: "you", type: "text", content: "بعمل انستجرام كلون 😂", reactions: [], status: "seen", createdAt: new Date(Date.now() - 3500000).toISOString() },
    { id: "m5", conversationId: "c1", senderId: "1", type: "text", content: "That's awesome! Can't wait to see it.", reactions: [], status: "seen", createdAt: new Date(Date.now() - 3400000).toISOString() },
  ],
  "c2": [
    { id: "m6", conversationId: "c2", senderId: "2", type: "text", content: "Did you see the new post?", reactions: [], status: "delivered", createdAt: new Date(Date.now() - 60000).toISOString() },
  ],
  "c3": [
    { id: "m7", conversationId: "c3", senderId: "3", type: "text", content: "Just do it.", reactions: [], status: "seen", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  "c6": [
    { id: "m8", conversationId: "c6", senderId: "6", type: "text", content: "Hello, can we collaborate?", reactions: [], status: "delivered", createdAt: new Date(Date.now() - 1000000).toISOString() },
  ]
};

Object.keys(seedConversations).forEach(cId => {
  const msgs = seedMessages[cId];
  if (msgs && msgs.length > 0) {
    seedConversations[cId].lastMessage = msgs[msgs.length - 1];
  }
});
