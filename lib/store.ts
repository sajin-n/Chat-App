import { create } from "zustand";

type ActiveView = "chats" | "groups" | "blog";

interface ChatState {
  activeView: ActiveView;
  activeChatId: string | null;
  activeGroupId: string | null;
  mobileMenuOpen: boolean;
  setActiveView: (view: ActiveView) => void;
  setActiveChatId: (id: string | null) => void;
  setActiveGroupId: (id: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeView: "chats",
  activeChatId: null,
  activeGroupId: null,
  mobileMenuOpen: false,
  setActiveView: (view) => set({ activeView: view, activeChatId: null, activeGroupId: null }),
  setActiveChatId: (id) => set({ activeChatId: id, activeGroupId: null, mobileMenuOpen: false }),
  setActiveGroupId: (id) => set({ activeGroupId: id, activeChatId: null, mobileMenuOpen: false }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
