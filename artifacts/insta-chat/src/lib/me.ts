import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MeState {
  username: string;
  token: string | null;
  setAuth: (u: string, t: string) => void;
  clearAuth: () => void;
}

export const useMe = create<MeState>()(
  persist(
    (set) => ({
      username: "",
      token: null,
      setAuth: (u, t) => set({ username: u.trim().toLowerCase().replace(/^@/, ""), token: t }),
      clearAuth: () => set({ username: "", token: null }),
    }),
    { name: "ig-me" },
  ),
);

export function getMe(): string {
  return useMe.getState().username;
}
