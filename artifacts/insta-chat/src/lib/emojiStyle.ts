import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EmojiStyle } from "emoji-picker-react";

export type EmojiStyleKey = "apple" | "facebook" | "google" | "twitter" | "native";

export const EMOJI_STYLE_OPTIONS: { key: EmojiStyleKey; label: string }[] = [
  { key: "apple", label: "Instagram (Apple)" },
  { key: "facebook", label: "Facebook" },
  { key: "google", label: "WhatsApp (Google)" },
  { key: "twitter", label: "Twitter" },
  { key: "native", label: "System default" },
];

export const EMOJI_STYLE_TO_PICKER: Record<EmojiStyleKey, EmojiStyle> = {
  apple: EmojiStyle.APPLE,
  facebook: EmojiStyle.FACEBOOK,
  google: EmojiStyle.GOOGLE,
  twitter: EmojiStyle.TWITTER,
  native: EmojiStyle.NATIVE,
};

interface EmojiStyleState {
  style: EmojiStyleKey;
  setStyle: (s: EmojiStyleKey) => void;
}

export const useEmojiStyle = create<EmojiStyleState>()(
  persist(
    (set) => ({
      style: "apple",
      setStyle: (style) => set({ style }),
    }),
    { name: "ig-emoji-style" },
  ),
);
