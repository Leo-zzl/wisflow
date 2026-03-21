import { describe, it, expect, beforeEach } from 'vitest';
import { useRecordingStore, RecordingStatus } from '../recordingStore';

describe('录音状态管理', () => {
  beforeEach(() => {
    useRecordingStore.setState({ status: 'idle' });
  });

  describe('初始状态', () => {
    it('应用启动时录音状态应为空闲', () => {
      const { status } = useRecordingStore.getState();

      expect(status).toBe<RecordingStatus>('idle');
    });
  });

  describe('开始录音', () => {
    it('用户按下快捷键后录音状态应变为录音中', () => {
      const { startRecording } = useRecordingStore.getState();

      startRecording();

      expect(useRecordingStore.getState().status).toBe<RecordingStatus>('recording');
    });

    it('从空闲状态可以直接进入录音中状态', () => {
      useRecordingStore.setState({ status: 'idle' });

      useRecordingStore.getState().startRecording();

      expect(useRecordingStore.getState().status).toBe('recording');
    });
  });

  describe('语音处理', () => {
    it('用户松开快捷键后录音状态应变为处理中', () => {
      useRecordingStore.setState({ status: 'recording' });
      const { startProcessing } = useRecordingStore.getState();

      startProcessing();

      expect(useRecordingStore.getState().status).toBe<RecordingStatus>('processing');
    });

    it('语音处理完成后录音状态应恢复到空闲', () => {
      useRecordingStore.setState({ status: 'processing' });
      const { finishProcessing } = useRecordingStore.getState();

      finishProcessing();

      expect(useRecordingStore.getState().status).toBe<RecordingStatus>('idle');
    });
  });

  describe('完整录音流程', () => {
    it('应支持 空闲→录音中→处理中→空闲 的完整状态流转', () => {
      const store = useRecordingStore.getState();

      expect(store.status).toBe('idle');

      store.startRecording();
      expect(useRecordingStore.getState().status).toBe('recording');

      useRecordingStore.getState().startProcessing();
      expect(useRecordingStore.getState().status).toBe('processing');

      useRecordingStore.getState().finishProcessing();
      expect(useRecordingStore.getState().status).toBe('idle');
    });
  });
});
