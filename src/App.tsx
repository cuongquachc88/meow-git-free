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
                title={bottomVisible ? "Hide panel" : "Show Files & Diff"}
              >
                <span style={{ fontSize: 8, writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {bottomVisible ? "▶" : "◀"} Files & Diff
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
                        Files &amp; diff
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
        {/* SVG cat — no image loading needed */}
        <div className="mx-auto mb-8" style={{ width: 88, height: 88 }}>
          <div
            className="w-full h-full rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(168,85,247,0.25) 100%)",
              border: "1px solid rgba(129,140,248,0.3)",
              boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <CatSVG />
          </div>
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

function CatSVG() {
  return (
    <svg width="50" height="50" viewBox="0 0 52 52" fill="none">
      <path d="M10 20 L6 6 L18 14 Z" fill="rgba(129,140,248,0.85)" />
      <path d="M42 20 L46 6 L34 14 Z" fill="rgba(129,140,248,0.85)" />
      <path d="M11 18 L8 9 L17 15 Z" fill="rgba(168,85,247,0.5)" />
      <path d="M41 18 L44 9 L35 15 Z" fill="rgba(168,85,247,0.5)" />
      <ellipse cx="26" cy="28" rx="18" ry="16" fill="rgba(129,140,248,0.9)" />
      <ellipse cx="19" cy="25" rx="3.5" ry="4" fill="white" />
      <ellipse cx="33" cy="25" rx="3.5" ry="4" fill="white" />
      <circle cx="20" cy="26" r="2" fill="#1e1b4b" />
      <circle cx="34" cy="26" r="2" fill="#1e1b4b" />
      <circle cx="21" cy="25" r="0.8" fill="white" opacity="0.8" />
      <circle cx="35" cy="25" r="0.8" fill="white" opacity="0.8" />
      <ellipse cx="26" cy="31" rx="2" ry="1.2" fill="rgba(236,72,153,0.8)" />
      <path d="M23 33 Q26 36 29 33" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <line x1="5" y1="28" x2="18" y2="30" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <line x1="5" y1="31" x2="18" y2="31.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <circle cx="5" cy="28" r="1.5" fill="rgba(129,140,248,0.7)" />
      <circle cx="5" cy="31" r="1.5" fill="rgba(129,140,248,0.7)" />
      <line x1="47" y1="28" x2="34" y2="30" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <line x1="47" y1="31" x2="34" y2="31.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <circle cx="47" cy="28" r="1.5" fill="rgba(52,211,153,0.7)" />
      <circle cx="47" cy="31" r="1.5" fill="rgba(52,211,153,0.7)" />
    </svg>
  );
}

export default App;
