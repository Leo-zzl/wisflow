import { create } from 'zustand';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface RecordingState {
  status: RecordingStatus;
  startRecording: () => void;
  startProcessing: () => void;
  finishProcessing: () => void;
}

// Stub — implementation intentionally left empty for red TDD state
export const useRecordingStore = create<RecordingState>(() => ({
  status: 'idle',
  startRecording: () => {},
  startProcessing: () => {},
  finishProcessing: () => {},
}));
