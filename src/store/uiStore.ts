import { create } from "zustand";

type Panel = "diff" | "files" | "graph";
type Theme = "dark" | "light";

interface UIStore {
  theme: Theme;
  activePanel: Panel;
  sidebarWidth: number;
  commitGraphHeight: number;
  isCommitDialogOpen: boolean;
  isBranchDialogOpen: boolean;
  isAccountManagerOpen: boolean;

  setTheme: (theme: Theme) => void;
  setActivePanel: (panel: Panel) => void;
  setSidebarWidth: (w: number) => void;
  setCommitGraphHeight: (h: number) => void;
  openCommitDialog: () => void;
  closeCommitDialog: () => void;
  openBranchDialog: () => void;
  closeBranchDialog: () => void;
  toggleAccountManager: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: "dark",
  activePanel: "diff",
  sidebarWidth: 240,
  commitGraphHeight: 300,
  isCommitDialogOpen: false,
  isBranchDialogOpen: false,
  isAccountManagerOpen: false,

  setTheme: (theme) => set({ theme }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setCommitGraphHeight: (commitGraphHeight) => set({ commitGraphHeight }),
  openCommitDialog: () => set({ isCommitDialogOpen: true }),
  closeCommitDialog: () => set({ isCommitDialogOpen: false }),
  openBranchDialog: () => set({ isBranchDialogOpen: true }),
  closeBranchDialog: () => set({ isBranchDialogOpen: false }),
  toggleAccountManager: () => set((s) => ({ isAccountManagerOpen: !s.isAccountManagerOpen })),
}));
