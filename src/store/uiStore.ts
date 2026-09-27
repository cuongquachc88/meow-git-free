import { create } from "zustand";

export type Theme = "dark" | "light" | "auto";
type Panel = "diff" | "files" | "graph";

interface UIStore {
  theme: Theme;
  activePanel: Panel;
  sidebarWidth: number;
  commitGraphHeight: number;
  isCommitDialogOpen: boolean;
  isBranchDialogOpen: boolean;
  isMergeDialogOpen: boolean;
  mergeDialogSource: string | null;
  branchDialogFromRef: string | null;
  isAccountManagerOpen: boolean;
  isRemoteSetupOpen: boolean;
  remoteSetupDefaultRepoName: string;
  remoteSetupResolve: ((success: boolean) => void) | null;
  /** Full-width center viewer over commit graph (blame / diff). */
  centerFileView: null | "diff" | "blame";

  setTheme: (theme: Theme) => void;
  setActivePanel: (panel: Panel) => void;
  setSidebarWidth: (w: number) => void;
  setCommitGraphHeight: (h: number) => void;
  openCommitDialog: () => void;
  closeCommitDialog: () => void;
  openBranchDialog: (fromRef?: string) => void;
  closeBranchDialog: () => void;
  openMergeDialog: (source?: string) => void;
  closeMergeDialog: () => void;
  toggleAccountManager: () => void;
  openCenterFileView: (mode: "diff" | "blame") => void;
  closeCenterFileView: () => void;
}

const savedTheme = (localStorage.getItem("meow-theme") as Theme | null) ?? "auto";

export const useUIStore = create<UIStore>((set) => ({
  theme: savedTheme,
  activePanel: "diff",
  sidebarWidth: 240,
  commitGraphHeight: 300,
  isCommitDialogOpen: false,
  isBranchDialogOpen: false,
  isMergeDialogOpen: false,
  mergeDialogSource: null,
  branchDialogFromRef: null,
  isAccountManagerOpen: false,
  isRemoteSetupOpen: false,
  remoteSetupDefaultRepoName: "",
  remoteSetupResolve: null,
  centerFileView: null,

  setTheme: (theme) => {
    localStorage.setItem("meow-theme", theme);
    set({ theme });
  },
  setActivePanel: (activePanel) => set({ activePanel }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setCommitGraphHeight: (commitGraphHeight) => set({ commitGraphHeight }),
  openCommitDialog: () => set({ isCommitDialogOpen: true }),
  closeCommitDialog: () => set({ isCommitDialogOpen: false }),
  openBranchDialog: (fromRef) =>
    set({ isBranchDialogOpen: true, branchDialogFromRef: fromRef ?? null }),
  closeBranchDialog: () => set({ isBranchDialogOpen: false, branchDialogFromRef: null }),
  openMergeDialog: (source) =>
    set({ isMergeDialogOpen: true, mergeDialogSource: source ?? null }),
  closeMergeDialog: () => set({ isMergeDialogOpen: false, mergeDialogSource: null }),
  toggleAccountManager: () => set((s) => ({ isAccountManagerOpen: !s.isAccountManagerOpen })),
  openCenterFileView: (centerFileView) => set({ centerFileView }),
  closeCenterFileView: () => set({ centerFileView: null }),
}));
