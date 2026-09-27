import { Sidebar } from "./components/layout/Sidebar";
import { ToolBar } from "./components/layout/ToolBar";
import { CommitGraph } from "./components/layout/CommitGraph";
import { DiffViewer } from "./components/layout/DiffViewer";
import { FilesPanel } from "./components/layout/FilesPanel";
import { CommitDialog } from "./components/git/CommitDialog";
import { BranchDialog } from "./components/git/BranchDialog";
import { AccountManager } from "./components/accounts/AccountManager";
import { useRepoStore } from "./store/repoStore";

function App() {
  const { activeRepoPath } = useRepoStore();

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 overflow-hidden">
      <ToolBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-col flex-1 overflow-hidden">
          {activeRepoPath ? (
            <>
              <div className="h-64 border-b border-gray-700 overflow-hidden">
                <CommitGraph />
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="w-64 border-r border-gray-700 overflow-hidden">
                  <FilesPanel />
                </div>
                <div className="flex-1 overflow-hidden">
                  <DiffViewer />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <div className="text-6xl mb-4">🐱</div>
                <p className="text-xl font-semibold text-gray-400">Meow Git</p>
                <p className="text-sm mt-2">Open a repository to get started</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <CommitDialog />
      <BranchDialog />
      <AccountManager />
    </div>
  );
}

export default App;
