import { create } from 'zustand';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface RecordingState {
  status: RecordingStatus;
  startRecording: () => void;
  startProcessing: () => void;
  finishProcessing: () => void;
}

export const useRecordingStore = create<RecordingState>(set => ({
  status: 'idle',
  startRecording: () => set({ status: 'recording' }),
  startProcessing: () => set({ status: 'processing' }),
  finishProcessing: () => set({ status: 'idle' }),
}));
