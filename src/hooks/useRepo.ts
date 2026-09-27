import { useRepoStore } from "../store/repoStore";
import { git } from "../ipc/git";

export function useRepo() {
  const store = useRepoStore();

  const openRepo = async (path: string) => {
    const info = await git.openRepo(path);
    store.addRepo(info);
    await store.setActiveRepo(path);
    return info;
  };

  const cloneRepo = async (url: string, path: string) => {
    const info = await git.cloneRepo(url, path);
    store.addRepo(info);
    await store.setActiveRepo(path);
    return info;
  };

  return { ...store, openRepo, cloneRepo };
}
