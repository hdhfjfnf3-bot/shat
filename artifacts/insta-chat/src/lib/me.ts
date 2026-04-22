import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MeState {
  username: string;
  setUsername: (u: string) => void;
  clearUsername: () => void;
}

export const useMe = create<MeState>()(
  persist(
    (set) => ({
      username: "",
      setUsername: (u) => set({ username: u.trim().toLowerCase().replace(/^@/, "") }),
      clearUsername: () => set({ username: "" }),
    }),
    { name: "ig-me" },
  ),
);

export function getMe(): string {
  return useMe.getState().username;
}
