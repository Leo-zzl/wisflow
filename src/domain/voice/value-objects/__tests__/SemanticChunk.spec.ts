import { describe, it, expect } from 'vitest';
import { SemanticChunk } from '../SemanticChunk';

const makeAudioData = (length: number): Float32Array =>
  new Float32Array(Array.from({ length }, (_, i) => Math.sin(i * 0.1)));

describe('SemanticChunk', () => {
  describe('创建语义块', () => {
    it('应该使用有效参数创建语义块', () => {
      const audioData = makeAudioData(1600);
      const chunk = new SemanticChunk({
        audioData,
        sampleRate: 16000,
        durationMs: 100,
        estimatedLength: 4.5,
        triggerReason: 'length_threshold',
      });

      expect(chunk.sampleRate).toBe(16000);
      expect(chunk.durationMs).toBe(100);
      expect(chunk.estimatedLength).toBe(4.5);
      expect(chunk.triggerReason).toBe('length_threshold');
      expect(chunk.sampleCount).toBe(1600);
    });

    it('应该复制音频数据（不可变）', () => {
      const audioData = makeAudioData(100);
      const chunk = new SemanticChunk({
        audioData,
        sampleRate: 16000,
        durationMs: 10,
        estimatedLength: 1,
        triggerReason: 'pause_detected',
      });

      audioData[0] = 999;
      expect(chunk.audioData[0]).not.toBe(999);
    });

    it('应该支持所有触发原因类型', () => {
      const base = { audioData: makeAudioData(100), sampleRate: 16000, durationMs: 10, estimatedLength: 1 };

      expect(new SemanticChunk({ ...base, triggerReason: 'length_threshold' }).triggerReason).toBe('length_threshold');
      expect(new SemanticChunk({ ...base, triggerReason: 'pause_detected' }).triggerReason).toBe('pause_detected');
      expect(new SemanticChunk({ ...base, triggerReason: 'session_end' }).triggerReason).toBe('session_end');
    });
  });

  describe('验证参数', () => {
    it('空音频数据应抛出错误', () => {
      expect(
        () =>
          new SemanticChunk({
            audioData: new Float32Array(0),
            sampleRate: 16000,
            durationMs: 100,
            estimatedLength: 1,
            triggerReason: 'length_threshold',
          })
      ).toThrow('语义块音频数据不能为空');
    });

    it('负估计字数应抛出错误', () => {
      expect(
        () =>
          new SemanticChunk({
            audioData: makeAudioData(100),
            sampleRate: 16000,
            durationMs: 100,
            estimatedLength: -1,
            triggerReason: 'length_threshold',
          })
      ).toThrow('估计字数不能为负数');
    });
  });
});
