import { describe, it, expect } from 'vitest';
import { isValidTransition, RecordingStateTransitions } from '../RecordingState';

describe('RecordingState', () => {
  describe('isValidTransition', () => {
    it('idle 可以转换到 recording', () => {
      expect(isValidTransition('idle', 'recording')).toBe(true);
    });

    it('idle 不能直接转换到 stopped', () => {
      expect(isValidTransition('idle', 'stopped')).toBe(false);
    });

    it('recording 可以转换到 paused', () => {
      expect(isValidTransition('recording', 'paused')).toBe(true);
    });

    it('recording 可以转换到 stopped', () => {
      expect(isValidTransition('recording', 'stopped')).toBe(true);
    });

    it('paused 可以恢复到 recording', () => {
      expect(isValidTransition('paused', 'recording')).toBe(true);
    });

    it('paused 可以转换到 stopped', () => {
      expect(isValidTransition('paused', 'stopped')).toBe(true);
    });

    it('stopped 不能转换到任何状态', () => {
      expect(isValidTransition('stopped', 'recording')).toBe(false);
      expect(isValidTransition('stopped', 'paused')).toBe(false);
      expect(isValidTransition('stopped', 'idle')).toBe(false);
    });
  });

  describe('RecordingStateTransitions', () => {
    it('应该为每个状态定义转换规则', () => {
      expect(RecordingStateTransitions).toHaveProperty('idle');
      expect(RecordingStateTransitions).toHaveProperty('recording');
      expect(RecordingStateTransitions).toHaveProperty('paused');
      expect(RecordingStateTransitions).toHaveProperty('stopped');
    });

    it('stopped 状态没有后续转换', () => {
      expect(RecordingStateTransitions['stopped']).toHaveLength(0);
    });
  });
});
