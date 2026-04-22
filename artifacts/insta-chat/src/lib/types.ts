export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  isOnline: boolean;
  lastSeenAt: string;
};

export type MessageType = "text" | "image" | "voice" | "gif" | "sticker" | "reply" | "like";
export type MessageStatus = "sending" | "sent" | "delivered" | "seen";

export type Reaction = {
  userId: string;
  emoji: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  replyToId?: string;
  reactions: Reaction[];
  status: MessageStatus;
  createdAt: string;
  isUnsent?: boolean;
  isEdited?: boolean;
};

export type ConversationType = "primary" | "general" | "requests";

export type Conversation = {
  id: string;
  type: ConversationType;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  isOnline: boolean;
  lastActiveAt: string;
};

export const CURRENT_USER: User = {
  id: "you",
  username: "you",
  displayName: "You",
  avatarUrl: "https://i.pravatar.cc/150?u=you",
  isVerified: false,
  isOnline: true,
  lastSeenAt: new Date().toISOString(),
};
