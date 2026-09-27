import { useUIStore } from "../store/uiStore";

export type SyncToastKind = "busy" | "ok" | "err";

export type SyncToastState = {
  id: number;
  kind: SyncToastKind;
  message: string;
};

let seq = 0;

export function showSyncToast(message: string, kind: SyncToastKind): number {
  const id = ++seq;
  useUIStore.getState().setSyncToast({ id, kind, message });
  return id;
}

export function clearSyncToast(id?: number) {
  const cur = useUIStore.getState().syncToast;
  if (id != null && cur?.id !== id) return;
  useUIStore.getState().setSyncToast(null);
}
