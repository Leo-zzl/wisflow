import { RecordingStatus } from '../stores/recordingStore';

interface Props {
  status: RecordingStatus;
}

// Stub — intentionally incomplete for red TDD state
export function MicIndicator({ status: _status }: Props) {
  return <div data-testid="mic-indicator" />;
}
