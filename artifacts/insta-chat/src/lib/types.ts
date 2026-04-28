export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  isOnline: boolean;
  lastSeenAt: string;
};

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "gif"
  | "sticker"
  | "reply"
  | "like"
  | "game"
  | "theme"
  | "vanish_mode";

export type VoiceMeta = {
  duration: number;
  peaks: number[];
};
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
  voice?: VoiceMeta;
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

import { useMe } from "./me";

function liveMe(): User {
  const u = useMe.getState().username || "you";
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

export const CURRENT_USER = new Proxy({} as User, {
  get(_t, key) {
    return (liveMe() as any)[key as string];
  },
}) as User;
