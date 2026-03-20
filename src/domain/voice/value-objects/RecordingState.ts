export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export const RecordingStateTransitions: Record<RecordingState, RecordingState[]> = {
  idle: ['recording'],
  recording: ['paused', 'stopped'],
  paused: ['recording', 'stopped'],
  stopped: [],
};

export function isValidTransition(from: RecordingState, to: RecordingState): boolean {
  return RecordingStateTransitions[from].includes(to);
}
