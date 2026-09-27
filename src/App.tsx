import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { ToolBar } from "./components/layout/ToolBar";
import { CommitGraph } from "./components/layout/CommitGraph";
import { ChangesPanel } from "./components/layout/ChangesPanel";
import { DiffViewer } from "./components/layout/DiffViewer";
import { useUIStore } from "./store/uiStore";
import { CommitDialog } from "./components/git/CommitDialog";
import { BranchDialog } from "./components/git/BranchDialog";
import { MergeDialog } from "./components/git/MergeDialog";
import { AccountManager } from "./components/accounts/AccountManager";
import { OpenRepoDialog } from "./components/shared/OpenRepoDialog";
import {
  ResizeHandle,
  persistPanelWidth,
  readStoredPanelWidth,
} from "./components/shared/ResizeHandle";
import { useRepoStore } from "./store/repoStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { git } from "./ipc/git";

export const openRepoCallbacks: Array<() => void> = [];

import { PANEL_HEADER_H } from "./constants/layout";
import { AppLogo } from "./components/shared/AppLogo";

function App() {
  const { activeRepoPath, selectedCommit, selectedDiff } = useRepoStore();
  const centerFileView = useUIStore((s) => s.centerFileView);
  const closeCenterFileView = useUIStore((s) => s.closeCenterFileView);

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(false);
  const [changesPanelWidth, setChangesPanelWidth] = useState(readStoredPanelWidth);
  const dragStartWidth = useRef(changesPanelWidth);

  const clampPanelWidth = (w: number) => Math.min(720, Math.max(280, w));

  const handlePanelResizeStart = useCallback(() => {
    dragStartWidth.current = changesPanelWidth;
  }, [changesPanelWidth]);

  const handlePanelResize = useCallback((totalDelta: number) => {
    setChangesPanelWidth(clampPanelWidth(dragStartWidth.current + totalDelta));
  }, []);

  const handlePanelResizeEnd = useCallback(() => {
    setChangesPanelWidth((w) => {
      persistPanelWidth(w);
      return w;
    });
  }, []);

  openRepoCallbacks.length = 0;
  openRepoCallbacks.push(() => setShowOpenDialog(true));

  useEffect(() => {
    if (selectedCommit) setBottomVisible(true);
  }, [selectedCommit]);

  return (
    <div className="app-bg flex flex-col h-screen overflow-hidden">
      <ToolBar
        onOpenRepo={() => setShowOpenDialog(true)}
        changesPanelVisible={bottomVisible}
        onToggleChangesPanel={() => setBottomVisible((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {activeRepoPath && (
          sidebarVisible ? (
            <Sidebar
              onOpenRepo={() => setShowOpenDialog(true)}
              onHide={() => setSidebarVisible(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSidebarVisible(true)}
              className="shrink-0 flex flex-col items-center justify-center gap-1 w-5 border-r transition-colors hover:bg-[color:var(--bg-hover)]"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-faint)" }}
              title="Show branch list"
            >
              <span
                style={{
                  fontSize: 8,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                ▶ Branches
              </span>
            </button>
          )
        )}

        <main className="flex flex-1 overflow-hidden min-w-0 min-h-0">
          {activeRepoPath ? (
            <>
              {/* Center: commit graph */}
              <div className="flex flex-col flex-1 overflow-hidden min-w-[320px]">
                {centerFileView && selectedDiff ? (
                  <DiffViewer
                    variant="center"
                    forcedMode={centerFileView}
                    onCollapse={closeCenterFileView}
                  />
                ) : (
                  <CommitGraph onOpenChangesPanel={() => setBottomVisible(true)} />
                )}
              </div>

              {/* Right panel toggle strip */}
              <button
                onClick={() => setBottomVisible((v) => !v)}
                className="shrink-0 flex flex-col items-center justify-center gap-1 w-5 border-l transition-colors"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-faint)" }}
                title={bottomVisible ? "Hide panel" : "Show Files panel"}
              >
                <span style={{ fontSize: 8, writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {bottomVisible ? "▶" : "◀"} Files
                </span>
              </button>

              {bottomVisible && (
                <>
                  <ResizeHandle
                    side="left"
                    onResizeStart={handlePanelResizeStart}
                    onResize={handlePanelResize}
                    onResizeEnd={handlePanelResizeEnd}
                  />
                  <div
                    className="flex flex-col shrink-0 overflow-hidden border-l min-w-0"
                    style={{ width: changesPanelWidth, borderColor: "var(--border)" }}
                  >
                    <div
                      className="panel-title-bar shrink-0 flex items-center gap-2 px-3"
                      style={{
                        height: PANEL_HEADER_H,
                        minHeight: PANEL_HEADER_H,
                      }}
                    >
                      <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                        Files
                      </span>
                      <button
                        type="button"
                        onClick={() => setBottomVisible(false)}
                        title="Hide panel"
                        className="w-6 h-6 flex items-center justify-center rounded-md shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <PanelCloseIcon />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ChangesPanel />
                    </div>
                  </div>
                </>
              )}

            </>
          ) : (
            <WelcomeScreen onOpenRepo={() => setShowOpenDialog(true)} />
          )}
        </main>
      </div>

      <CommitDialog />
      <BranchDialog />
      <MergeDialog />
      <AccountManager />
      {showOpenDialog && <OpenRepoDialog onClose={() => setShowOpenDialog(false)} />}
    </div>
  );
}

function PanelCloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function WelcomeScreen({ onOpenRepo }: { onOpenRepo: () => void }) {
  const { addRepo, setActiveRepo } = useRepoStore();

  const handleQuickOpen = async () => {
    const selected = await openDialog({ directory: true, multiple: false, title: "Select Repository" });
    if (!selected) return;
    try {
      const info = await git.openRepo(selected as string);
      addRepo(info);
      await setActiveRepo(selected as string);
    } catch {
      // not a git repo — open dialog with path pre-filled
      onOpenRepo();
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center" style={{ maxWidth: 480 }}>
        <div className="mx-auto mb-8" style={{ width: 96, height: 96 }}>
          <AppLogo
            size={96}
            style={{
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        <h1 className="text-[32px] font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          Meow Git
        </h1>
        <p className="text-[14px] mb-10" style={{ color: "var(--text-muted)" }}>
          A beautiful Git client · multi-account · multi-provider
        </p>

        <div className="flex gap-3 justify-center mb-8">
          <button
            onClick={handleQuickOpen}
            className="glass-btn glass-btn-accent px-8 py-3 text-[14px] rounded-xl font-medium"
          >
            Open Repository
          </button>
          <button
            onClick={onOpenRepo}
            className="glass-btn px-6 py-3 text-[14px] rounded-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Clone Remote
          </button>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {["GitHub", "GitLab", "Bitbucket", "Azure DevOps", "Gitea"].map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-[11px]"
              style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
