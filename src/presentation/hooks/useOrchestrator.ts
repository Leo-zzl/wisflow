import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useRecordingStore } from '../stores/recordingStore';

export interface OrchestratorFacade {
  onShortcutPressed(): Promise<void>;
  onShortcutReleased(): Promise<void>;
}

export type ListenFn = typeof listen;

const defaultListen: ListenFn = listen;

export function useOrchestrator(
  orchestrator: OrchestratorFacade,
  listenFn: ListenFn = defaultListen
): void {
  const { startRecording, startProcessing, finishProcessing } = useRecordingStore();

  useEffect(() => {
    const handlePressed = (): void => {
      startRecording();
      void orchestrator.onShortcutPressed();
    };

    const handleReleased = (): void => {
      startProcessing();
      void orchestrator.onShortcutReleased().then(() => {
        finishProcessing();
      });
    };

    const unsubPressed = listenFn('shortcut-pressed', handlePressed);
    const unsubReleased = listenFn('shortcut-released', handleReleased);

    return (): void => {
      void unsubPressed.then(fn => fn());
      void unsubReleased.then(fn => fn());
    };
  }, [orchestrator, listenFn, startRecording, startProcessing, finishProcessing]);
}
