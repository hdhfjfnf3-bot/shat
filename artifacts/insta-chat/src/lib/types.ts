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
  | "poll"
  | "vanish_mode"
  | "nudge"
  | "spoiler"
  | "bomb"
  | "confetti"
  | "whisper"
  | "heartbeat"
  | "love_letter"
  | "hug"
  | "focus"
  | "poke"
  | "hold_hand"
  | "kiss"
  | "encrypted"
  | "canvas"
  | "knock"
  | "cheers"
  | "feed"
  | "slap"
  | "weather"
  | "walk_away"
  | "shatter"
  | "bored"
  | "cry_together"
  | "loneliness"
  | "missing_you"
  | "anxiety"
  | "nostalgia"
  | "forgive_me"
  | "scratch_reveal"
  | "heartbeat_sync"
  | "coffee_share"
  | "staring_contest"
  | "universe_share";

export type VoiceMeta = {
  duration: number;
  peaks: number[];
};
export type MessageStatus = "sending" | "sent" | "delivered" | "seen";

export type Reaction = {
  userId: string;
  emoji: string;
};

export type PollOption = {
  id: string;
  text: string;
  votes: string[]; // array of userIds
};

export type PollMeta = {
  question: string;
  options: PollOption[];
  multipleAnswers: boolean;
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
  voice?: VoiceMeta;
  poll?: PollMeta;
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
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  bgImage?: string;
  bgOpacity?: number;
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
