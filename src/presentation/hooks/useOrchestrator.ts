import type { listen } from '@tauri-apps/api/event';

export interface OrchestratorFacade {
  onShortcutPressed(): Promise<void>;
  onShortcutReleased(): Promise<void>;
}

export type ListenFn = typeof listen;

// Stub — intentionally incomplete for red TDD state
export function useOrchestrator(
  _orchestrator: OrchestratorFacade,
  _listenFn: ListenFn = listen
): void {
  // no-op
}
