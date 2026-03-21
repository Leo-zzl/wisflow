import { RecordingStatus } from '../stores/recordingStore';

interface Props {
  status: RecordingStatus;
}

export function MicIndicator({ status }: Props) {
  const isVisible = status !== 'idle';
  const isRecording = status === 'recording';

  return (
    <div
      data-testid="mic-indicator"
      hidden={!isVisible}
      className="flex items-center justify-center w-full h-full"
      role={isVisible ? 'status' : undefined}
      aria-label={isRecording ? '正在录音' : '处理中'}
    >
      <div
        data-testid="mic-circle"
        className={[
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'bg-rust-600',
          'shadow-lg',
          isRecording ? 'animate-mic-pulse' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* 麦克风图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="white"
          className="w-7 h-7"
          aria-hidden="true"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V22h-2v2h6v-2h-2v-1.06A9 9 0 0 0 21 12v-2h-2Z" />
        </svg>
      </div>
    </div>
  );
}
