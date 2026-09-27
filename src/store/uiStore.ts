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
  /** When set, AccountPatDialog collects a PAT for this account id. */
  patPromptAccountId: string | null;
  isRemoteSetupOpen: boolean;
  remoteSetupDefaultRepoName: string;
  remoteSetupReason: "no_remote" | "repo_not_found" | null;
  remoteSetupResolve: ((success: boolean) => void) | null;
  /** Full-width center viewer over commit graph (blame / diff). */
  centerFileView: null | "diff" | "blame";
  syncToast: { id: number; kind: "busy" | "ok" | "err"; message: string } | null;

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
  openPatPrompt: (accountId: string) => void;
  closePatPrompt: () => void;
  openCenterFileView: (mode: "diff" | "blame") => void;
  closeCenterFileView: () => void;
  setSyncToast: (toast: UIStore["syncToast"]) => void;
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
  patPromptAccountId: null,
  isRemoteSetupOpen: false,
  remoteSetupDefaultRepoName: "",
  remoteSetupReason: null,
  remoteSetupResolve: null,
  centerFileView: null,
  syncToast: null,

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
  openPatPrompt: (accountId) => set({ patPromptAccountId: accountId }),
  closePatPrompt: () => set({ patPromptAccountId: null }),
  openCenterFileView: (centerFileView) => set({ centerFileView }),
  closeCenterFileView: () => set({ centerFileView: null }),
  setSyncToast: (syncToast) => set({ syncToast }),
}));
