import { describe, it, expect } from 'vitest';
import { VADFrame } from '../VADFrame';

describe('VADFrame', () => {
  describe('创建帧', () => {
    it('高概率帧应标记为语音', () => {
      const frame = new VADFrame({ speechProbability: 0.9, timestamp: 0, durationMs: 10 });
      expect(frame.isSpeech).toBe(true);
    });

    it('低概率帧应标记为静音', () => {
      const frame = new VADFrame({ speechProbability: 0.2, timestamp: 0, durationMs: 10 });
      expect(frame.isSpeech).toBe(false);
    });

    it('等于阈值（0.5）的帧应标记为语音', () => {
      const frame = new VADFrame({
        speechProbability: VADFrame.SPEECH_THRESHOLD,
        timestamp: 0,
        durationMs: 10,
      });
      expect(frame.isSpeech).toBe(true);
    });
  });

  describe('工厂方法', () => {
    it('VADFrame.speech 创建语音帧', () => {
      const frame = VADFrame.speech(100, 10);
      expect(frame.isSpeech).toBe(true);
      expect(frame.speechProbability).toBe(1.0);
      expect(frame.timestamp).toBe(100);
      expect(frame.durationMs).toBe(10);
    });

    it('VADFrame.silence 创建静音帧', () => {
      const frame = VADFrame.silence(200, 10);
      expect(frame.isSpeech).toBe(false);
      expect(frame.speechProbability).toBe(0.0);
    });
  });

  describe('验证参数', () => {
    it('概率超出范围应抛出错误', () => {
      expect(
        () => new VADFrame({ speechProbability: 1.5, timestamp: 0, durationMs: 10 })
      ).toThrow('语音概率必须在 [0, 1] 范围内');

      expect(
        () => new VADFrame({ speechProbability: -0.1, timestamp: 0, durationMs: 10 })
      ).toThrow('语音概率必须在 [0, 1] 范围内');
    });

    it('负时间戳应抛出错误', () => {
      expect(
        () => new VADFrame({ speechProbability: 0.8, timestamp: -1, durationMs: 10 })
      ).toThrow('时间戳不能为负数');
    });

    it('零时长应抛出错误', () => {
      expect(
        () => new VADFrame({ speechProbability: 0.8, timestamp: 0, durationMs: 0 })
      ).toThrow('帧时长必须大于0');
    });
  });
});
