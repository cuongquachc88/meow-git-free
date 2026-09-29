import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRepoStore } from "../../store/repoStore";
import { useUIStore } from "../../store/uiStore";
import { useAccountStore } from "../../store/accountStore";
import { SyncCancelledError, describeSyncError, pullRepoBranch, pushRepoBranch } from "../../lib/syncRemote";
import { git } from "../../ipc/git";
import type { BranchInfo } from "../../types/git";
import { APP_VERSION } from "../../constants/appVersion";
import { PANEL_HEADER_H } from "../../constants/layout";
import { openBranchName } from "../../lib/headBranch";
import {
  IconBranchLocal,
  IconBranchRemote,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconHeadBranch,
  IconRepo,
  IconSearch,
  IconStash,
  IconTag,
} from "../shared/icons/GitIcons";

type SectionId = "local" | "remote" | "tags" | "stash";

export function Sidebar({ onOpenRepo, onHide }: { onOpenRepo: () => void; onHide?: () => void }) {
  const { activeRepoPath, branches, setActiveRepo, closeRepo, refreshAfterRemoteSync, repos } =
    useRepoStore();
  const { openBranchDialog, openMergeDialog } = useUIStore();
  const { getAccountForRepo } = useAccountStore();
  const currentBranch = openBranchName(branches);

  const handlePushBranch = async (localBranchName: string) => {
    if (!activeRepoPath) return;
    try {
      await pushRepoBranch(activeRepoPath, localBranchName, getAccountForRepo);
      await refreshAfterRemoteSync();
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      const msg = describeSyncError(e);
      if (msg) alert(`Push failed: ${msg}`);
    }
  };

  const handlePullBranch = async (localBranchName: string) => {
    if (!activeRepoPath) return;
    try {
      const clean = await pullRepoBranch(activeRepoPath, localBranchName, getAccountForRepo);
      await refreshAfterRemoteSync();
      if (!clean) alert("Pull has conflicts — resolve in Files & diff.");
    } catch (e) {
      if (e instanceof SyncCancelledError) return;
      const msg = describeSyncError(e);
      if (msg) alert(`Pull failed: ${msg}`);
    }
  };

  const handlePullRemoteBranch = async (remoteFullName: string) => {
    const slash = remoteFullName.indexOf("/");
    if (slash <= 0) return;
    const localName = remoteFullName.slice(slash + 1);
    await handlePullBranch(localName);
  };
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    local: true,
    remote: false,
    tags: false,
    stash: false,
  });
  const [tags, setTags] = useState<{ name: string; targetId: string }[]>([]);
  const [stashes, setStashes] = useState<{ index: number; message: string }[]>([]);
  const [stashBusy, setStashBusy] = useState(false);

  const localBranches = useMemo(
    () => branches.filter((b) => b.kind === "Local"),
    [branches],
  );
  const remoteBranches = useMemo(
    () => branches.filter((b) => b.kind === "Remote"),
    [branches],
  );

  const q = search.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);

  const filteredLocal = useMemo(() => localBranches.filter((b) => match(b.name)), [localBranches, q]);
  const filteredRemote = useMemo(() => remoteBranches.filter((b) => match(b.name)), [remoteBranches, q]);
  const filteredTags = useMemo(() => tags.filter((t) => match(t.name)), [tags, q]);
  const filteredStashes = useMemo(
    () => stashes.filter((s) => match(s.message)),
    [stashes, q],
  );

  const viewingCount = q
    ? filteredLocal.length + filteredRemote.length + filteredTags.length + filteredStashes.length
    : localBranches.length + remoteBranches.length + tags.length + stashes.length;

  useEffect(() => {
    if (!activeRepoPath) {
      setTags([]);
      setStashes([]);
      return;
    }
    git.listTags(activeRepoPath).then(setTags).catch(() => setTags([]));
    git.listStashes(activeRepoPath)
      .then((items) =>
        setStashes(
          (items as { index: number; message: string }[]).map((s, i) => ({
            index: s.index ?? i,
            message: s.message ?? `stash@{${i}}`,
          })),
        ),
      )
      .catch(() => setStashes([]));
  }, [activeRepoPath, branches]);

  const reloadStashes = () => {
    if (!activeRepoPath) return;
    git.listStashes(activeRepoPath)
      .then((items) =>
        setStashes(
          (items as { index: number; message: string }[]).map((s, i) => ({
            index: s.index ?? i,
            message: s.message ?? `stash@{${i}}`,
          })),
        ),
      )
      .catch(() => setStashes([]));
  };

  const toggleSection = (id: SectionId) => {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleCheckout = async (name: string) => {
    if (!activeRepoPath) return;
    try {
      await git.checkoutBranch(activeRepoPath, name);
      await setActiveRepo(activeRepoPath);
    } catch (e) {
      alert(`Checkout failed: ${e}`);
    }
  };

  const handleMergeIntoCurrent = async (sourceName: string) => {
    if (!activeRepoPath || !currentBranch) return;
    if (sourceName === currentBranch) return;
    if (!window.confirm(`Merge "${sourceName}" into "${currentBranch}"?`)) return;
    try {
      const clean = await git.mergeBranch(activeRepoPath, sourceName);
      await refreshAfterRemoteSync();
      if (!clean) alert("Merge has conflicts — resolve in Files & diff.");
    } catch (e) {
      alert(`Merge failed: ${e}`);
    }
  };

  const handleNewBranchFrom = (fromRef: string) => {
    openBranchDialog(fromRef);
  };

  const popStash = async (index: number) => {
    if (!activeRepoPath) return;
    setStashBusy(true);
    try {
      await git.popStash(activeRepoPath, index);
      reloadStashes();
    } catch (e) {
      alert(`Pop failed: ${e}`);
    } finally {
      setStashBusy(false);
    }
  };

  const dropStash = async (index: number) => {
    if (!activeRepoPath) return;
    setStashBusy(true);
    try {
      await git.dropStash(activeRepoPath, index);
      reloadStashes();
    } catch (e) {
      alert(`Drop failed: ${e}`);
    } finally {
      setStashBusy(false);
    }
  };

  return (
    <aside
      className="glass-sidebar flex flex-col h-full shrink-0 overflow-hidden border-r"
      style={{ width: 268, borderColor: "var(--border)" }}
    >
      <div
        className="panel-title-bar shrink-0 flex items-center gap-2 px-3"
        style={{
          height: PANEL_HEADER_H,
          minHeight: PANEL_HEADER_H,
        }}
      >
        <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: "var(--text-primary)" }}>
          Branches
        </span>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            title="Hide branch list"
            className="w-6 h-6 flex items-center justify-center rounded-md shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <IconChevronLeft size={14} />
          </button>
        )}
      </div>

      <div className="panel-subheader shrink-0 px-2 py-2">
        <p className="text-[10px] mb-1 px-0.5" style={{ color: "var(--text-muted)" }}>
          {q ? `Viewing ${viewingCount}` : `Viewing ${localBranches.length + remoteBranches.length + tags.length + stashes.length}`}
        </p>
        <div className="relative">
          <input
            className="w-full text-[11px] py-1.5 pl-2.5 pr-8 rounded-md"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            placeholder="Filter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-faint)" }}
          >
            <IconSearch size={11} />
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
            <SidebarSection
              title="LOCAL"
              count={filteredLocal.length}
              open={openSections.local}
              onToggle={() => toggleSection("local")}
            >
              {filteredLocal.length === 0 ? (
                <EmptyHint text={q ? "No matching branches" : "No local branches"} />
              ) : (
                filteredLocal.map((b) => (
                  <BranchRow
                    key={b.name}
                    branch={b}
                    currentBranch={currentBranch}
                    onCheckout={handleCheckout}
                    onMergeIntoCurrent={handleMergeIntoCurrent}
                    onNewBranchFrom={handleNewBranchFrom}
                    onOpenMergeDialog={(source) => openMergeDialog(source)}
                    onPush={() => handlePushBranch(b.name)}
                    onPull={() => handlePullBranch(b.name)}
                  />
                ))
              )}
            </SidebarSection>

            <SidebarSection
              title="REMOTE"
              count={filteredRemote.length}
              open={openSections.remote}
              onToggle={() => toggleSection("remote")}
            >
              {filteredRemote.length === 0 ? (
                <EmptyHint text={q ? "No matching remotes" : "No remote branches"} />
              ) : (
                filteredRemote.map((b) => (
                  <RemoteBranchRow
                    key={b.name}
                    branch={b}
                    onCheckout={handleCheckout}
                    onNewBranchFrom={handleNewBranchFrom}
                    onPull={() => handlePullRemoteBranch(b.name)}
                  />
                ))
              )}
            </SidebarSection>

            <SidebarSection
              title="TAGS"
              count={filteredTags.length}
              open={openSections.tags}
              onToggle={() => toggleSection("tags")}
            >
              {filteredTags.length === 0 ? (
                <EmptyHint text={q ? "No matching tags" : "No tags"} />
              ) : (
                filteredTags.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 px-3 py-1 mx-1">
                    <IconTag size={12} style={{ color: "var(--text-faint)" }} />
                    <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
                      {t.name}
                    </span>
                  </div>
                ))
              )}
            </SidebarSection>

            <SidebarSection
              title="STASH"
              count={filteredStashes.length}
              open={openSections.stash}
              onToggle={() => toggleSection("stash")}
            >
              {filteredStashes.length === 0 ? (
                <EmptyHint text={q ? "No matching stashes" : "No stashes"} />
              ) : (
                filteredStashes.map((s) => (
                  <div
                    key={s.index}
                    className="flex items-center gap-1.5 px-3 py-1 mx-1 rounded-md group"
                  >
                    <IconStash size={12} style={{ color: "var(--text-faint)" }} />
                    <span className="text-[11px] truncate flex-1" style={{ color: "var(--text-secondary)" }}>
                      {s.message}
                    </span>
                    <button
                      type="button"
                      disabled={stashBusy}
                      onClick={() => popStash(s.index)}
                      className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
                    >
                      Pop
                    </button>
                    <button
                      type="button"
                      disabled={stashBusy}
                      onClick={() => dropStash(s.index)}
                      className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded"
                      style={{ color: "rgba(239,68,68,0.85)" }}
                    >
                      Drop
                    </button>
                  </div>
                ))
              )}
            </SidebarSection>
      </div>

      <div className="shrink-0 px-2 py-2 border-t flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={onOpenRepo}
          className="w-full glass-btn text-[11px] py-1.5 rounded-lg flex items-center justify-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <IconRepo size={12} />
          Open Repository
        </button>
        {activeRepoPath && (
          <button
            type="button"
            onClick={() => {
              const name = repos.find((r) => r.path === activeRepoPath)?.name ?? "repository";
              if (window.confirm(`Close "${name}" in Meow Git?\n(Files on disk are not deleted.)`)) {
                void closeRepo(activeRepoPath);
              }
            }}
            className="w-full glass-btn text-[11px] py-1.5 rounded-lg"
            style={{ color: "rgba(239,68,68,0.75)" }}
          >
            Close repository
          </button>
        )}
        <p
          className="text-[10px] text-center pt-1 pb-0.5 font-mono tracking-wide select-none"
          style={{ color: "var(--text-faint)" }}
        >
          Meow Git v{APP_VERSION}
        </p>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 transition-colors hover:bg-[color:var(--bg-hover)]"
      >
        <IconChevronRight size={10} open={open} style={{ color: "var(--text-faint)" }} />
        <span
          className="text-[10px] font-bold tracking-[0.08em]"
          style={{ color: open ? "var(--text-primary)" : "var(--text-muted)" }}
        >
          {title}
        </span>
        <span
          className="ml-auto text-[10px] tabular-nums min-w-[1.25rem] text-right"
          style={{ color: "var(--text-faint)" }}
        >
          {count}
        </span>
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="px-3 py-1.5 text-[10px]" style={{ color: "var(--text-faint)" }}>
      {text}
    </p>
  );
}

type BranchMenuPos = { x: number; y: number };

function truncateLabel(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function BranchContextMenu({
  pos,
  branchName,
  isCurrent,
  currentBranch,
  onClose,
  onCheckout,
  onMergeIntoCurrent,
  onNewBranchFrom,
  onOpenMergeDialog,
  onPush,
  onPull,
}: {
  pos: BranchMenuPos;
  branchName: string;
  isCurrent: boolean;
  currentBranch: string | null;
  onClose: () => void;
  onCheckout: () => void;
  onMergeIntoCurrent?: () => void;
  onNewBranchFrom: () => void;
  onOpenMergeDialog?: () => void;
  onPush?: () => void;
  onPull?: () => void;
}) {
  const items: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void }[] = [
    {
      label: isCurrent ? "Checked out" : "Checkout",
      disabled: isCurrent,
      onClick: () => {
        onCheckout();
        onClose();
      },
    },
    {
      label: "Pull from origin",
      disabled: !onPull,
      onClick: () => {
        onPull?.();
        onClose();
      },
    },
    {
      label: "Push to origin",
      disabled: !onPush,
      onClick: () => {
        onPush?.();
        onClose();
      },
    },
    {
      label: currentBranch
        ? `Merge into ${truncateLabel(currentBranch, 22)}`
        : "Merge into current",
      disabled: isCurrent || !currentBranch || !onMergeIntoCurrent,
      onClick: () => {
        onMergeIntoCurrent?.();
        onClose();
      },
    },
    {
      label: "New branch from here…",
      onClick: () => {
        onNewBranchFrom();
        onClose();
      },
    },
    {
      label: "Merge branches…",
      disabled: !onOpenMergeDialog,
      onClick: () => {
        onOpenMergeDialog?.();
        onClose();
      },
    },
  ];

  const menuW = 220;
  const left = Math.min(pos.x, window.innerWidth - menuW - 8);
  const top = Math.min(pos.y, window.innerHeight - 260);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[300]" onClick={onClose} />
      <div
        className="fixed z-[301] py-1 rounded-lg glass-context-menu"
        style={{
          left,
          top,
          width: menuW,
          maxWidth: "min(260px, calc(100vw - 16px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="px-2.5 py-1.5 text-[10px] font-mono truncate border-b"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          title={branchName}
        >
          {branchName}
        </p>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            title={item.label}
            onClick={item.onClick}
            className="w-full text-left px-2.5 py-1.5 text-[11px] truncate disabled:opacity-40 hover:bg-[color:var(--bg-hover)]"
            style={{ color: item.danger ? "rgba(239,68,68,0.9)" : "var(--text-secondary)" }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}

function BranchRow({
  branch,
  currentBranch,
  onCheckout,
  onMergeIntoCurrent,
  onNewBranchFrom,
  onOpenMergeDialog,
  onPush,
  onPull,
}: {
  branch: BranchInfo;
  currentBranch: string | null;
  onCheckout: (name: string) => void;
  onMergeIntoCurrent: (name: string) => void;
  onNewBranchFrom: (fromRef: string) => void;
  onOpenMergeDialog: (source: string) => void;
  onPush: () => void;
  onPull: () => void;
}) {
  const isHead = branch.isHead;
  const [menu, setMenu] = useState<BranchMenuPos | null>(null);

  return (
    <div className="relative group mx-1" style={{ width: "calc(100% - 8px)" }}>
      <button
        type="button"
        onClick={() => onCheckout(branch.name)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className="w-full text-left flex items-center gap-2 px-3 py-1.5 pr-8 rounded-md transition-colors"
        style={
          isHead
            ? {
                background: "rgba(52,211,153,0.14)",
                border: "1px solid rgba(52,211,153,0.28)",
                color: "var(--text-primary)",
              }
            : {
                color: "var(--text-secondary)",
                border: "1px solid transparent",
              }
        }
        onMouseEnter={(e) => {
          if (!isHead) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isHead) (e.currentTarget as HTMLButtonElement).style.background = "";
        }}
      >
        <span className="shrink-0 w-4 flex justify-center">
          {isHead ? (
            <IconCheck size={13} style={{ color: "#34d399" }} />
          ) : (
            <IconBranchLocal size={12} style={{ color: "var(--text-faint)" }} />
          )}
        </span>
        <span className="text-[11px] truncate flex-1 font-medium">{branch.name}</span>
        {(branch.ahead ?? 0) > 0 && (
          <span className="text-[9px] font-mono shrink-0" style={{ color: "rgba(52,211,153,0.85)" }}>
            ↑{branch.ahead}
          </span>
        )}
        {(branch.behind ?? 0) > 0 && (
          <span className="text-[9px] font-mono shrink-0" style={{ color: "rgba(251,146,60,0.85)" }}>
            ↓{branch.behind}
          </span>
        )}
        {isHead && (
          <span className="shrink-0 opacity-80" title="Current branch">
            <IconHeadBranch size={12} />
          </span>
        )}
      </button>
      <button
        type="button"
        title="Branch actions"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-[14px]"
        style={{ color: "var(--text-muted)" }}
        onClick={(e) => {
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        ⋯
      </button>
      {menu && (
        <BranchContextMenu
          pos={menu}
          branchName={branch.name}
          isCurrent={isHead}
          currentBranch={currentBranch}
          onClose={() => setMenu(null)}
          onCheckout={() => onCheckout(branch.name)}
          onMergeIntoCurrent={
            !isHead ? () => onMergeIntoCurrent(branch.name) : undefined
          }
          onNewBranchFrom={() => onNewBranchFrom(branch.name)}
          onOpenMergeDialog={() => onOpenMergeDialog(branch.name)}
          onPush={onPush}
          onPull={onPull}
        />
      )}
    </div>
  );
}

function RemoteBranchRow({
  branch,
  onCheckout,
  onNewBranchFrom,
  onPull,
}: {
  branch: BranchInfo;
  onCheckout: (name: string) => void;
  onNewBranchFrom: (fromRef: string) => void;
  onPull?: () => void;
}) {
  const shortName = branch.name.includes("/") ? branch.name.split("/").slice(1).join("/") : branch.name;
  const [menu, setMenu] = useState<BranchMenuPos | null>(null);

  return (
    <div className="relative group mx-1" style={{ width: "calc(100% - 8px)" }}>
      <button
        type="button"
        onClick={() => onCheckout(branch.name)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className="w-full text-left flex items-center gap-2 px-3 py-1 pr-8 rounded-md transition-colors hover:bg-[color:var(--bg-hover)]"
        style={{ color: "var(--text-muted)" }}
      >
        <IconBranchRemote size={12} style={{ color: "var(--text-faint)" }} />
        <span className="text-[11px] truncate flex-1">{shortName}</span>
      </button>
      <button
        type="button"
        title="Branch actions"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-[14px]"
        style={{ color: "var(--text-muted)" }}
        onClick={(e) => {
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        ⋯
      </button>
      {menu && (
        <BranchContextMenu
          pos={menu}
          branchName={branch.name}
          isCurrent={false}
          currentBranch={null}
          onClose={() => setMenu(null)}
          onCheckout={() => onCheckout(branch.name)}
          onNewBranchFrom={() => onNewBranchFrom(branch.name)}
          onPull={onPull}
        />
      )}
    </div>
  );
}

